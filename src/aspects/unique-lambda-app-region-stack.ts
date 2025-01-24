import type { IAspect, Stack } from "aws-cdk-lib";
import type { IConstruct } from "constructs";
import { GuLambdaFunction } from "../constructs/lambda";

export class UniqueLambdaAppRegionStackAspect implements IAspect {
  readonly stack: Stack;
  private seenCombinations = new Set<string>();

  // eslint-disable-next-line custom-rules/valid-constructors -- doesn't apply here
  public constructor(stack: Stack) {
    this.stack = stack;
  }

  public visit(node: IConstruct): void {
    if (node instanceof GuLambdaFunction) {
      const combination = `${this.stack.region}:${this.stack.stackName}:${node.app}`;

      if (this.seenCombinations.has(combination)) {
        throw new Error(
          `GuLambdaFunction must have a unique combination of app, region and stack. Found duplicate: ${node.app}`,
        );
      }

      this.seenCombinations.add(combination);
    }
  }
}
