import { Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import { Tags } from "@aws-cdk/core";
import type { Policy } from "@aws-cdk/aws-iam";
import type { Stack } from "@aws-cdk/core";

// IAM Policies need to be attached to a role, group or user to be created in a stack
export const attachPolicyToTestRole = (stack: Stack, policy: Policy, id: string = "TestRole"): void => {
  const role = new Role(stack, id, {
    assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
  });
  Tags.of(role).add("App", "testing");
  policy.attachToRole(role);
};
