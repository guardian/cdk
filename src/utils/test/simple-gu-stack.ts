import { App } from "@aws-cdk/core";
import type { Environment } from "@aws-cdk/core";
import { GuStack, GuStackForInfrastructure } from "../../constructs/core";
import type { GuStackProps } from "../../constructs/core";

// Some stacks (such as ones using access logging on load balancers) require specifying a region
interface SimpleGuStackProps extends Partial<GuStackProps> {
  env?: Environment;
}

export const simpleGuStackForTesting: (props?: SimpleGuStackProps) => GuStack = (props?: SimpleGuStackProps) =>
  new GuStack(new App(), "Test", {
    stack: props?.stack ?? "test-stack",
    ...props,
  });

export const simpleInfraStackForTesting: () => GuStackForInfrastructure = () => {
  return new GuStackForInfrastructure(new App(), "Test", {
    stack: "test-stack",
  });
};
