import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import type { GuStack } from "../../core";
import { GuStringParameter } from "../../core";
import type { GuPolicyProps } from "./base-policy";
import { GuPolicy } from "./base-policy";

export class GuLogShippingPolicy extends GuPolicy {
  constructor(scope: GuStack, id: string = "GuLogShippingPolicy", props?: GuPolicyProps) {
    super(scope, id, { ...props });

    const loggingStreamNameParam = new GuStringParameter(scope, "LoggingStreamName", {
      description: "SSM parameter containing the Name (not ARN) on the kinesis stream",
      default: "/account/services/logging.stream.name",
      fromSSM: true,
      noEcho: true,
    });

    this.addStatements(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["kinesis:Describe*", "kinesis:Put*"],
        resources: [`arn:aws:kinesis:${scope.region}:${scope.account}:stream/${loggingStreamNameParam.valueAsString}`],
      })
    );
  }
}
