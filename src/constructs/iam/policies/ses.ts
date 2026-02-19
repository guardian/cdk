import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { GuStack } from "../../core";
import { GuAllowPolicy } from "./base-policy";

interface GuSESSenderPolicyProps {
  /**
   * The email address to allow sending from.
   *
   * This address should be registered with SES.
   */
  sendingAddress: string;
}

export class GuSESSenderPolicy extends GuAllowPolicy {
  static buildStatements(scope: GuStack, sendingAddress: string): PolicyStatement[] {
    return [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ses:SendEmail"],
        resources: [`arn:aws:ses:${scope.region}:${scope.account}:identity/${sendingAddress}`],
      }),
    ];
  }

  constructor(scope: GuStack, props: GuSESSenderPolicyProps) {
    super(scope, "GuSESSenderPolicy", {
      actions: ["ses:SendEmail"],
      resources: [`arn:aws:ses:${scope.region}:${scope.account}:identity/${props.sendingAddress}`],
    });
  }
}
