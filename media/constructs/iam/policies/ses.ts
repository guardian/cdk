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
  constructor(scope: GuStack, props: GuSESSenderPolicyProps) {
    super(scope, "GuSESSenderPolicy", {
      actions: ["ses:SendEmail"],
      resources: [`arn:aws:ses:${scope.region}:${scope.account}:identity/${props.sendingAddress}`],
    });
  }
}
