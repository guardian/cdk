import "@aws-cdk/assert/jest";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../../test/utils";
import { GuDescribeEC2Policy } from "./describe-ec2";

describe("DescribeEC2Policy", () => {
  it("can accept a custom policy name", () => {
    const stack = simpleGuStackForTesting();

    const policy = new GuDescribeEC2Policy(stack, "DescribeEC2Policy", { policyName: "my-awesome-policy" });

    attachPolicyToTestRole(stack, policy);

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
