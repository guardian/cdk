import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { isSingletonPresentInStack } from "../../../utils/singleton";
import type { GuStack } from "../../core";
import { GuLoggingStreamNameParameter } from "../../core";

export class GuLogShippingPolicy extends Policy {
  private static instance: GuLogShippingPolicy | undefined;

  private constructor(scope: GuStack) {
    super(scope, "GuLogShippingPolicy", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["kinesis:Describe*", "kinesis:Put*"],
          resources: [
            `arn:aws:kinesis:${scope.region}:${scope.account}:stream/${
              GuLoggingStreamNameParameter.getInstance(scope).valueAsString
            }`,
          ],
        }),
      ],
    });
  }

  public static getInstance(stack: GuStack): GuLogShippingPolicy {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuLogShippingPolicy(stack);
    }

    return this.instance;
  }
}
