import { Template } from "aws-cdk-lib/assertions";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuECSInstanceRolePolicyForManagedInstances } from "./ecs-managed-instances-role-policy";

describe("GuECSInstanceRolePolicyForManagedInstances", () => {
  it("creates a policy with correct ECS permissions for a specific cluster", () => {
    const stack = simpleGuStackForTesting();
    const clusterArn = "arn:aws:ecs:eu-west-1:123456789012:cluster/test-cluster";

    const policy = new GuECSInstanceRolePolicyForManagedInstances(stack, "ECSPolicy", {
      clusterArn,
    });

    attachPolicyToTestRole(stack, policy);

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "ecs:DiscoverPollEndpoint",
            Effect: "Allow",
            Resource: "*",
          },
          {
            Action: "ecs:RegisterContainerInstance",
            Effect: "Allow",
            Resource: clusterArn,
          },
          {
            Action: "ecs:Poll",
            Effect: "Allow",
            Resource: ["arn:aws:ecs:*:*:container-instance/*", "arn:aws:ecs:*:*:task-set/*"],
          },
          {
            Action: ["ecs:StartTelemetrySession", "ecs:PutSystemLogEvents"],
            Effect: "Allow",
            Resource: "arn:aws:ecs:*:*:container-instance/*",
          },
          {
            Action: ["ecs:SubmitAttachmentStateChanges", "ecs:SubmitTaskStateChange"],
            Effect: "Allow",
            Resource: clusterArn,
          },
        ],
      },
    });
  });
});
