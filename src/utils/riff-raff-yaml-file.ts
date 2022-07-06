import type { App } from "aws-cdk-lib";
import { Token } from "aws-cdk-lib";
import chalk from "chalk";
import { GuStack } from "../constructs/core";

export class RiffRaffYamlFile {
  private readonly allCdkStacks: GuStack[];
  private readonly allStackNames: string[];
  private readonly allStages: string[];

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

  // eslint-disable-next-line custom-rules/valid-constructors -- this needs to sit above GuStack on the cdk tree
  constructor(app: App) {
    this.allCdkStacks = app.node.findAll().filter((_) => _ instanceof GuStack) as GuStack[];
    this.allStages = Array.from(new Set(this.allCdkStacks.map(({ stage }) => stage)));
    this.allStackNames = Array.from(new Set(this.allCdkStacks.map(({ stack }) => stack)));

    this.validateStacksInApp();
    this.validateAllRegionsAreResolved();
  }
}
