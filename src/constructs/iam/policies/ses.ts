import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import type { GuStack } from "../../core";
import { GuGuardianEmailSenderParameter } from "../../core";
import type { GuPolicyProps } from "./base-policy";
import { GuPolicy } from "./base-policy";

export class GuSESSenderPolicy extends GuPolicy {
  constructor(scope: GuStack, id: string = "GuSESSenderPolicy", props?: GuPolicyProps) {
    super(scope, id, { ...props });

    const emailSenderParam = new GuGuardianEmailSenderParameter(scope);

    this.addStatements(
      // see https://docs.aws.amazon.com/ses/latest/DeveloperGuide/sending-authorization-policies.html
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ses:SendEmail"],
        resources: [`arn:aws:ses:${scope.region}:${scope.account}:identity/${emailSenderParam.valueAsString}`],
      })
    );
  }
}
