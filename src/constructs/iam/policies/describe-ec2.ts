import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import type { GuStack } from "../../core";
import { GuPolicy } from "./base-policy";

export class GuDescribeEC2Policy extends GuPolicy {
  private static instance: GuPolicy | undefined;

  private constructor(scope: GuStack) {
    super(scope, "DescribeEC2Policy", {
      policyName: "describe-ec2-policy",
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "autoscaling:DescribeAutoScalingInstances",
            "autoscaling:DescribeAutoScalingGroups",
            "ec2:DescribeTags",
            "ec2:DescribeInstances",
          ],
          resources: ["*"],
        }),
      ],
    });
  }

  public static getInstance(stack: GuStack): GuDescribeEC2Policy {
    // Resources can only live in the same App so return a new instance where necessary.
    // See https://github.com/aws/aws-cdk/blob/0ea4b19afd639541e5f1d7c1783032ee480c307e/packages/%40aws-cdk/core/lib/private/refs.ts#L47-L50
    const isSameStack = this.instance?.node.root === stack.node.root;

    if (!this.instance || !isSameStack) {
      this.instance = new GuDescribeEC2Policy(stack);
    }

    return this.instance;
  }
}
