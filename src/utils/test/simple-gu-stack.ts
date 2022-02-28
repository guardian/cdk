import { App } from "@aws-cdk/core";
import { GuStack } from "../../constructs/core";
import type { GuStackProps } from "../../constructs/core";

export function simpleGuStackForTesting(props?: Partial<GuStackProps>) {
  return new GuStack(new App(), "Test", {
    stack: props?.stack ?? "test-stack",
    stage: props?.stage ?? "TEST",
    ...props,
  });
}
