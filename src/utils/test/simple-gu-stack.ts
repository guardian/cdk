import { App } from "@aws-cdk/core";
import { GuStack } from "../../constructs/core";
import type { GuStackProps } from "../../constructs/core";

export const simpleGuStackForTesting: (props?: Partial<GuStackProps>) => GuStack = (props?: Partial<GuStackProps>) =>
  new GuStack(new App(), "Test", { stack: props?.stack ?? "test-stack", ...props });
