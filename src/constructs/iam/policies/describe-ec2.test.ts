import "@aws-cdk/assert/jest";
import { Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import { App } from "@aws-cdk/core";
import { GuStack } from "../../core";
import { GuDescribeEC2Policy } from "./describe-ec2";

describe("DescribeEC2Policy", () => {
  it("can accept a custom policy name", () => {
    const stack = new GuStack(new App());

    const policy = new GuDescribeEC2Policy(stack, "DescribeEC2Policy", { policyName: "my-awesome-policy" });

    // IAM Policies need to be attached to a role, group or user to be created in a stack
    policy.attachToRole(
      new Role(stack, "TestRole", {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      })
    );

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyName: "my-awesome-policy",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: [
              "autoscaling:DescribeAutoScalingInstances",
              "autoscaling:DescribeAutoScalingGroups",
              "ec2:DescribeTags",
              "ec2:DescribeInstances",
            ],
            Effect: "Allow",
            Resource: "*",
          },
        ],
      },
    });
  });
});
