import { App } from "@aws-cdk/core";
import type { GuStackProps } from "../../src/constructs/core";
import { GuStack } from "../../src/constructs/core";

export const simpleGuStackForTesting: (props?: Partial<GuStackProps>) => GuStack = (props?: Partial<GuStackProps>) =>
  new GuStack(new App(), "Test", { app: "testing", stack: props?.stack ?? "test-stack", ...props });
