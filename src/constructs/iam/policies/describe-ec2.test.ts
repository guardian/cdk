import { suite, test } from "node:test";
import { Template } from "aws-cdk-lib/assertions";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuDescribeEC2Policy } from "./describe-ec2";

suite("DescribeEC2Policy", () => {
  test("creates the correct policy", () => {
    const stack = simpleGuStackForTesting();

    const policy = GuDescribeEC2Policy.getInstance(stack);

    attachPolicyToTestRole(stack, policy);

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyName: "describe-ec2-policy",
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
