import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { isSingletonPresentInStack } from "../../../utils/test";
import { GuPolicy } from "./base-policy";
import type { GuStack } from "../../core";

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
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuDescribeEC2Policy(stack);
    }

    return this.instance;
  }
}
