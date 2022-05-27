import { App } from "aws-cdk-lib";
import { GuApp, GuStack } from "../../constructs/core";
import type { GuStackProps } from "../../constructs/core";

export function simpleGuStackForTesting(props?: Partial<GuStackProps>) {
  return new GuStack(new App(), "Test", {
    stack: props?.stack ?? "test-stack",
    stage: props?.stage ?? "TEST",
    ...props,
  });
}

interface SimpleTestingResourcesProps extends Partial<GuStackProps> {
  appName?: string;
}

export function simpleTestingResources(props?: SimpleTestingResourcesProps) {
  const stack = simpleGuStackForTesting(props);
  const app = new GuApp(stack, props?.appName ?? "testing");
  return { stack, app };
}
