import type { PolicyProps } from "@aws-cdk/aws-iam";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import type { GuStack } from "../../core";
import type { GuPolicyProps } from "./base-policy";
import { GuPolicy } from "./base-policy";

export interface GuLogShippingPolicyProps extends GuPolicyProps {
  loggingStreamName: string;
}

export class GuLogShippingPolicy extends GuPolicy {
  private static getDefaultProps(scope: GuStack, props: GuLogShippingPolicyProps): PolicyProps {
    return {
      policyName: "log-shipping-policy",
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["kinesis:Describe*", "kinesis:Put*"],
          resources: [`arn:aws:kinesis:${scope.region}:${scope.account}:stream/${props.loggingStreamName}`],
        }),
      ],
    };
  }

  constructor(scope: GuStack, id: string = "LogShippingPolicy", props: GuLogShippingPolicyProps) {
    super(scope, id, {
      ...GuLogShippingPolicy.getDefaultProps(scope, props),
      ...props,
    });
  }
}
