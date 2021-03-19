import "@aws-cdk/assert/jest";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../../test/utils";
import { GuDescribeEC2Policy } from "./describe-ec2";

describe("DescribeEC2Policy", () => {
  it("creates the correct policy", () => {
    const stack = simpleGuStackForTesting();

    const policy = GuDescribeEC2Policy.getInstance(stack);

    attachPolicyToTestRole(stack, policy);

    expect(stack).toHaveResource("AWS::IAM::Policy", {
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
