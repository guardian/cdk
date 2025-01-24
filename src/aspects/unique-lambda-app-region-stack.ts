import type { IAspect, Stack } from "aws-cdk-lib";
import type { IConstruct } from "constructs";
import type { GuLambdaFunction } from "../constructs/lambda";

const isGuLambdaFunction = (node: IConstruct): node is GuLambdaFunction => {
  return node.constructor.name === "GuLambdaFunction";
};

export class UniqueLambdaAppRegionStackAspect implements IAspect {
  readonly stack: Stack;
  private seenCombinations = new Set<string>();

  // eslint-disable-next-line custom-rules/valid-constructors -- doesn't apply here
  public constructor(stack: Stack) {
    this.stack = stack;
  }

  public visit(node: IConstruct): void {
    // using a type guard instead of instanceof to avoid circular dependencies
    if (isGuLambdaFunction(node)) {
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
