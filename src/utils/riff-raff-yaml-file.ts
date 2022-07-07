import assert from "assert";
import { writeFileSync } from "fs";
import path from "path";
import type { App } from "aws-cdk-lib";
import { Token } from "aws-cdk-lib";
import chalk from "chalk";
import { dump } from "js-yaml";
import { GuStack } from "../constructs/core";
import { groupBy } from "./array";

interface RiffRaffYaml {
  allowedStages: Set<string>;
  deployments: Map<RiffRaffDeploymentName, RiffRaffDeploymentProps>;
}

type RiffRaffDeploymentName = string;

interface RiffRaffDeploymentProps {
  type: string;
  regions: Set<string>;
  stacks: Set<string>;
  app: string;
  contentDirectory: string;
  parameters: Record<string, string | boolean | Record<string, string>>;
  dependencies?: RiffRaffDeploymentName[];
  actions?: string[];
}

interface RiffRaffDeployment {
  name: RiffRaffDeploymentName;
  props: RiffRaffDeploymentProps;
}

export class RiffRaffYamlFile {
  private readonly allCdkStacks: GuStack[];
  private readonly allStackTags: string[];
  private readonly allStageTags: string[];
  private readonly allRegions: string[];

  private readonly riffRaffYaml: RiffRaffYaml;
  private readonly outDir: string;

  private groupByClassName(cdkStacks: GuStack[]): Record<string, GuStack[]> {
    return groupBy(cdkStacks, (stack) => stack.constructor.name);
  }

  private groupByStackTag(cdkStacks: GuStack[]): Record<string, GuStack[]> {
    return groupBy(cdkStacks, ({ stack }) => stack);
  }

  private groupByStageTag(cdkStacks: GuStack[]): Record<string, GuStack[]> {
    return groupBy(cdkStacks, ({ stage }) => stage);
  }

  private groupByRegion(cdkStacks: GuStack[]): Record<string, GuStack[]> {
    return groupBy(cdkStacks, ({ region }) => region);
  }

  private groupByClassNameStackRegionStage(
    cdkStacks: GuStack[]
  ): Record<string, Record<string, Record<string, Record<string, GuStack[]>>>> {
    return Object.entries(this.groupByClassName(cdkStacks)).reduce((acc, [className, stacksGroupedByClassName]) => {
      return {
        ...acc,
        [className]: Object.entries(this.groupByStackTag(stacksGroupedByClassName)).reduce(
          (acc, [stackTag, stacksGroupedByStackTag]) => {
            return {
              ...acc,
              [stackTag]: Object.entries(this.groupByRegion(stacksGroupedByStackTag)).reduce(
                (acc, [region, stacksGroupedByRegion]) => {
                  return {
                    ...acc,
                    [region]: this.groupByStageTag(stacksGroupedByRegion),
                  };
                },
                {}
              ),
            };
          },
          {}
        ),
      };
    }, {});
  }

  private isCdkStackPresent(
    expectedClassName: string,
    expectedStack: string,
    expectedRegion: string,
    expectedStage: string
  ): boolean {
    const matches = this.allCdkStacks.find((cdkStack) => {
      const {
        constructor: { name },
        stack,
        stage,
        region,
      } = cdkStack;
      return (
        name === expectedClassName && stack === expectedStack && stage === expectedStage && region === expectedRegion
      );
    });

    return !!matches;
  }

  /**
   * Check there are the appropriate number of `GuStack`s.
   * Expect to find an instance for each combination of `GuStack`, `stack`, `region`, and `stage`.
   *
   * If not valid, a message is logged describing what is missing to aid debugging.
   *
   * @private
   */
  private validateStacksInApp(): void {
    type ClassName = string;
    type StackTag = string;
    type StageTag = string;
    type RegionTag = string;
    type Found = "✅";
    type NotFound = "❌";
    type AppValidation = Record<ClassName, Record<StackTag, Record<RegionTag, Record<StageTag, Found | NotFound>>>>;

    const { allCdkStacks, allStackTags, allStageTags, allRegions } = this;

    const checks: AppValidation = allCdkStacks.reduce((acc, cdkStack) => {
      const className = cdkStack.constructor.name;

      return {
        ...acc,
        [className]: allStackTags.reduce((acc, stackTag) => {
          return {
            ...acc,
            [stackTag]: allRegions.reduce((acc, region) => {
              return {
                ...acc,
                [region]: allStageTags.reduce((acc, stageTag) => {
                  return {
                    ...acc,
                    [stageTag]: this.isCdkStackPresent(className, stackTag, region, stageTag) ? "✅" : "❌",
                  };
                }, {}),
              };
            }, {}),
          };
        }, {}),
      };
    }, {});

    const missingDefinitions = Object.values(checks).flatMap((groupedByStackTag) => {
      return Object.values(groupedByStackTag).flatMap((groupedByRegion) => {
        return Object.values(groupedByRegion).flatMap((groupedByStage) => {
          return Object.values(groupedByStage).filter((_) => _ === "❌");
        });
      });
    });

    if (missingDefinitions.length > 0) {
      const message = `Unable to produce a working riff-raff.yaml file; missing ${missingDefinitions.length} definitions`;

      console.log(`${message} (details below)`);
      Object.entries(checks).forEach(([className, detail]) => {
        console.log(`For the class: ${chalk.yellow(className)}`);
        console.table(detail);
      });

      throw new Error(message);
    }
  }

  private validateAllRegionsAreResolved(): void {
    const unresolved = this.allRegions.filter((region) => Token.isUnresolved(region));

    assert(
      unresolved.length === 0,
      new Error(`Unable to produce a working riff-raff.yaml file; all stacks must have an explicit region set`)
    );
  }

  private getCloudFormationDeployment(cdkStacks: GuStack[]): RiffRaffDeployment {
    const classNames = new Set(cdkStacks.map(({ constructor: { name } }) => name));
    assert(
      classNames.size === 1,
      new Error(`Expected cdkStacks to be of the same type, found ${classNames.size} types`)
    );

    const regions = new Set(cdkStacks.map(({ region }) => region));
    assert(regions.size === 1, new Error(`Expected cdkStacks to be of the same region, found ${regions.size} regions`));

    const stackTags = new Set(cdkStacks.map(({ stack }) => stack));
    assert(
      stackTags.size === 1,
      new Error(`Expected cdkStacks to have the same stack, found ${stackTags.size} stacks`)
    );

    const [className] = classNames;
    const [stack] = stackTags;
    const [region] = regions;

    // TODO remove `lodash.kebabcase` dep as it's not that much code to kebab-ise a string...
    const kebabClassName = className?.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    const deploymentName = [kebabClassName, "cfn", stack, region].join("-");

    return {
      name: deploymentName,
      props: {
        type: "cloud-formation",
        regions,
        stacks: stackTags,
        app: kebabClassName ?? "this should not happen as we've previously asserted against the size of `classNames`", // TODO how does Riff-Raff use this property?
        contentDirectory: this.outDir,
        parameters: {
          templateStagePaths: cdkStacks.reduce((acc, { stage, templateFile }) => {
            return { ...acc, [stage]: templateFile };
          }, {}),
        },
      },
    };
  }

  // eslint-disable-next-line custom-rules/valid-constructors -- this needs to sit above GuStack on the cdk tree
  constructor(app: App) {
    this.allCdkStacks = app.node.findAll().filter((_) => _ instanceof GuStack) as GuStack[];
    const allowedStages = new Set(this.allCdkStacks.map(({ stage }) => stage));
    this.allStageTags = Array.from(allowedStages);
    this.allStackTags = Array.from(new Set(this.allCdkStacks.map(({ stack }) => stack)));
    this.allRegions = Array.from(new Set(this.allCdkStacks.map(({ region }) => region)));

    this.validateStacksInApp();
    this.validateAllRegionsAreResolved();

    this.outDir = app.outdir;

    const deployments = new Map<RiffRaffDeploymentName, RiffRaffDeploymentProps>();

    const stacksGroupedByClass = this.groupByClassNameStackRegionStage(this.allCdkStacks);

    Object.values(stacksGroupedByClass).forEach((stacksGroupedByStackName) => {
      Object.values(stacksGroupedByStackName).forEach((stacksGroupedByRegion) => {
        Object.values(stacksGroupedByRegion).forEach((stacksGroupedByStage) => {
          const { name: cfnDeployName, props: cfnDeployProps } = this.getCloudFormationDeployment(
            Object.values(stacksGroupedByStage).flat()
          );
          deployments.set(cfnDeployName, cfnDeployProps);
        });
      });
    });

    this.riffRaffYaml = {
      allowedStages,
      deployments,
    };
  }

  toYAML(): string {
    // Add support for ES6 Set and Map. See https://github.com/nodeca/js-yaml/issues/436.
    const replacer = (_key: string, value: unknown) => {
      if (value instanceof Set) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- this is how `js-yaml` is typed
        return Array.from(value);
      }
      if (value instanceof Map) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- this is how `js-yaml` is typed
        return Object.fromEntries(value);
      }
      return value;
    };

    return dump(this.riffRaffYaml, { replacer });
  }

  synth(): void {
    const ourPath = path.join(this.outDir, "riff-raff.yaml");
    writeFileSync(ourPath, this.toYAML());
  }
}
