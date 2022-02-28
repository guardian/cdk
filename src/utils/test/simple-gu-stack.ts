import { App } from "@aws-cdk/core";
import { GuStack } from "../../constructs/core";
import type { GuStackProps } from "../../constructs/core";

export function simpleGuStackForTesting(props?: GuStackProps) {
  // const { stack, stage } = props ?? { stack: "test-stack", stage: "TEST" };
  const { stack, stage } = props ?? { stack: "test-stack", stage: "TEST" };
  return new GuStack(new App(), "Test", {
    stack,
    stage,
    ...props,
  });
}
