import { App } from "aws-cdk-lib";
import { GuStack } from "../../constructs/core";
import type { GuStackProps } from "../../constructs/core";
import { acknowledgeEmptyTemplate, acknowledgeHardcodedAZs, acknowledgeUnusedParameters } from "./validations";

export function simpleGuStackForTesting(props?: Partial<GuStackProps>) {
  const stack = new GuStack(new App(), "Test", {
    stack: props?.stack ?? "test-stack",
    stage: props?.stage ?? "TEST",
    ...props,
  });

  // In unit tests, we don't need to produce minimal CFN stacks.
  acknowledgeUnusedParameters(stack);
  acknowledgeEmptyTemplate(stack);
  acknowledgeHardcodedAZs(stack);

  return stack;
}
