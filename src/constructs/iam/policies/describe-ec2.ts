import type { PolicyProps } from "@aws-cdk/aws-iam";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import type { GuStack } from "../../core";
import type { GuPolicyProps } from "./base-policy";
import { GuPolicy } from "./base-policy";

export class GuDescribeEC2Policy extends GuPolicy {
  private static getDefaultProps(): PolicyProps {
    return {
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
    };
  }

  constructor(scope: GuStack, id: string = "DescribeEC2Policy", props?: GuPolicyProps) {
    super(scope, id, { ...GuDescribeEC2Policy.getDefaultProps(), ...props });
  }
}
