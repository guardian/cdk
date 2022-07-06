import { writeFileSync } from "fs";
import path from "path";
import type { App } from "aws-cdk-lib";
import { Token } from "aws-cdk-lib";
import chalk from "chalk";
import { dump } from "js-yaml";
import { GuStack } from "../constructs/core";

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
  private readonly allStackNames: string[];
  private readonly allStages: string[];
  private readonly riffRaffYaml: RiffRaffYaml;
  private readonly outDir: string;

  private isCdkStackPresent(expectedClassName: string, expectedStack: string, expectedStage: string): boolean {
    const matches = this.allCdkStacks.find((cdkStack) => {
      const {
        constructor: { name },
        stack,
        stage,
      } = cdkStack;
      return name === expectedClassName && stack === expectedStack && stage === expectedStage;
    });

    return !!matches;
  }

  /**
   * Check there are the appropriate number of `GuStack`s.
   * Expect to find an instance for each combination of `GuStack`, `stack`, and `stage`.
   *
   * If not valid, a message is logged describing what is missing to aid debugging.
   *
   * @private
   */
  private validateStacksInApp(): void {
    type ClassName = string;
    type Stack = string;
    type Stage = string;
    type Found = "✅";
    type NotFound = "❌";
    type AppValidation = Record<ClassName, Record<Stack, Record<Stage, Found | NotFound>>>;

    const { allCdkStacks, allStackNames, allStages } = this;

    const checks: AppValidation = allCdkStacks.reduce((acc, cdkStack) => {
      const className = cdkStack.constructor.name;

      return {
        ...acc,
        [className]: allStackNames.reduce((acc, stack) => {
          return {
            ...acc,
            [stack]: allStages.reduce((acc, stage) => {
              return {
                ...acc,
                [stage]: this.isCdkStackPresent(className, stack, stage) ? "✅" : "❌",
              };
            }, {}),
          };
        }, {}),
      };
    }, {});

    const missingDefinitions = Object.values(checks).flatMap((i) => {
      return Object.values(i).flatMap((j) => {
        return Object.values(j).filter((_) => _ === "❌");
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
    const unresolved = this.allCdkStacks.filter(({ region }) => Token.isUnresolved(region));

    if (unresolved.length > 0) {
      throw new Error(`Unable to produce a working riff-raff.yaml file; all stacks must have an explicit region set`);
    }
  }

  private getCloudFormationDeployment(cdkStack: GuStack): RiffRaffDeployment {
    const {
      stack,
      templateFile,
      constructor: { name },
      region,
      stage,
    } = cdkStack;

    // TODO remove `lodash.kebabcase` dep as it's not that much code to kebab-ise a string...
    const kebabClassName = name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

    const deploymentName = [kebabClassName, "cfn", stack].join("-");

    return {
      name: deploymentName,
      props: {
        type: "cloud-formation",
        regions: new Set([region]),
        stacks: new Set([stack]),
        app: kebabClassName,
        contentDirectory: this.outDir,
        parameters: {
          templateStagePaths: {
            [stage]: templateFile, // TODO construct this correctly!
          },
        },
      },
    };
  }

  // eslint-disable-next-line custom-rules/valid-constructors -- this needs to sit above GuStack on the cdk tree
  constructor(app: App) {
    this.allCdkStacks = app.node.findAll().filter((_) => _ instanceof GuStack) as GuStack[];
    const allowedStages = new Set(this.allCdkStacks.map(({ stage }) => stage));
    this.allStages = Array.from(allowedStages);
    this.allStackNames = Array.from(new Set(this.allCdkStacks.map(({ stack }) => stack)));

    this.validateStacksInApp();
    this.validateAllRegionsAreResolved();

    this.outDir = app.outdir;

    const deployments = new Map<RiffRaffDeploymentName, RiffRaffDeploymentProps>();

    this.allCdkStacks.forEach((stack) => {
      const { name: cfnDeployName, props: cfnDeployProps } = this.getCloudFormationDeployment(stack);
      deployments.set(cfnDeployName, cfnDeployProps);
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
