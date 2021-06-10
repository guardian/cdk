import { GuGuardianEmailSenderParameter } from "../../core";
import type { GuStack } from "../../core";
import { GuAllowPolicy } from "./base-policy";

export class GuSESSenderPolicy extends GuAllowPolicy {
  constructor(scope: GuStack) {
    const emailSenderParam = new GuGuardianEmailSenderParameter(scope);

    super(scope, "GuSESSenderPolicy", {
      actions: ["ses:SendEmail"],
      resources: [`arn:aws:ses:${scope.region}:${scope.account}:identity/${emailSenderParam.valueAsString}`],
    });
  }
}
