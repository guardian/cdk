import { writeFileSync } from "fs";
import path from "path";
import type { App } from "aws-cdk-lib";
import { Token } from "aws-cdk-lib";
import chalk from "chalk";
import { dump } from "js-yaml";
import { GuStack } from "../../constructs/core";
import { cloudFormationDeployment } from "./deployments/cloudformation";
import { groupByClassNameStackRegionStage } from "./group-by";
import type {
  ClassName,
  GroupedCdkStacks,
  Region,
  RiffRaffDeploymentName,
  RiffRaffDeploymentProps,
  RiffRaffYaml,
  StackTag,
  StageTag,
} from "./types";

export class RiffRaffYamlFileExperimental {
  private readonly allCdkStacks: GuStack[];
  private readonly allStackTags: StackTag[];
  private readonly allStageTags: StageTag[];
  private readonly allRegions: Region[];

  private readonly riffRaffYaml: RiffRaffYaml;
  private readonly outdir: string;

  private isCdkStackPresent(
    expectedClassName: ClassName,
    expectedStack: StackTag,
    expectedRegion: Region,
    expectedStage: StageTag
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
   * Given the following:
   *
   * ```ts
   * const app = new App();
   *
   * class MyApplicationStack extends GuStack { }
   *
   * new MyApplicationStack(app, "App-CODE-deploy", {
   *   env: {
   *     region: "eu-west-1",
   *   },
   *   stack: "deploy",
   *   stage: "CODE"
   * });
   *
   * new MyApplicationStack(app, "App-PROD-media-service", {
   *   env: {
   *     region: "eu-west-1",
   *   },
   *   stack: "media-service",
   *   stage: "PROD",
   * });
   *
   * new MyApplicationStack(app, "App-PROD-deploy", {
   *   env: {
   *     region: "eu-west-1",
   *   },
   *   stack: "deploy",
   *   stage: "PROD"
   * });
   * ```
   *
   * This will log a message like this, where ❌ denotes something missing,
   * specifically there is no `CODE` template for `media-service`.
   *
   * ```log
   * Unable to produce a working riff-raff.yaml file; missing 1 definitions (details below)
   *
   * For the class: MyApplicationStack
   *
   * ┌───────────────┬────────────────────────────┐
   * │    (index)    │         eu-west-1          │
   * ├───────────────┼────────────────────────────┤
   * │    deploy     │ { CODE: '✅', PROD: '✅' } │
   * │ media-service │ { CODE: '❌', PROD: '✅' } │
   * └───────────────┴────────────────────────────┘
   * ```
   *
   * @private
   */
  private validateStacksInApp(): void {
    type Found = "✅";
    type NotFound = "❌";
    type AppValidation = Record<ClassName, Record<StackTag, Record<Region, Record<StageTag, Found | NotFound>>>>;

    const { allCdkStacks, allStackTags, allStageTags, allRegions } = this;

    const checks: AppValidation = allCdkStacks.reduce((accClassName, { constructor: { name } }) => {
      return {
        ...accClassName,
        [name]: allStackTags.reduce((accStackTag, stackTag) => {
          return {
            ...accStackTag,
            [stackTag]: allRegions.reduce((accRegion, region) => {
              return {
                ...accRegion,
                [region]: allStageTags.reduce((accStageTag, stageTag) => {
                  return {
                    ...accStageTag,
                    [stageTag]: this.isCdkStackPresent(name, stackTag, region, stageTag) ? "✅" : "❌",
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

    if (unresolved.length !== 0) {
      throw new Error(`Unable to produce a working riff-raff.yaml file; all stacks must have an explicit region set`);
    }
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

    this.outdir = app.outdir;

    const deployments = new Map<RiffRaffDeploymentName, RiffRaffDeploymentProps>();

    const groupedStacks: GroupedCdkStacks = groupByClassNameStackRegionStage(this.allCdkStacks);

    Object.values(groupedStacks).forEach((stackTagGroup) => {
      Object.values(stackTagGroup).forEach((regionGroup) => {
        Object.values(regionGroup).forEach((stageGroup) => {
          const { name: cfnDeployName, props: cfnDeployProps } = cloudFormationDeployment(
            Object.values(stageGroup).flat(),
            this.outdir
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

  /**
   * The `riff-raff.yaml` file as a string.
   * Useful for testing.
   */
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

  /**
   * Write the `riff-raff.yaml` file to disk.
   * It'll be located with the CFN JSON templates generated by `cdk synth`.
   */
  synth(): void {
    const outPath = path.join(this.outdir, "riff-raff.yaml");
    writeFileSync(outPath, this.toYAML());
  }
}
