import type { GuApp } from "../../core";
import { GuGuardianEmailSenderParameter } from "../../core";
import { GuAllowPolicy } from "./base-policy";

export class GuSESSenderPolicy extends GuAllowPolicy {
  constructor(scope: GuApp) {
    const emailSenderParam = new GuGuardianEmailSenderParameter(scope);
    const { account, region } = scope.parent;
    super(scope, "GuSESSenderPolicy", {
      actions: ["ses:SendEmail"],
      resources: [`arn:aws:ses:${region}:${account}:identity/${emailSenderParam.valueAsString}`],
    });
  }
}
