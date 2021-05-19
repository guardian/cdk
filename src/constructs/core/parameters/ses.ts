import { RegexPattern } from "../../../constants";
import { GuStringParameter } from "./base";
import type { GuStack } from "../stack";

export class GuGuardianEmailSenderParameter extends GuStringParameter {
  constructor(scope: GuStack) {
    super(scope, "EmailSenderAddress", {
      allowedPattern: RegexPattern.GUARDIAN_EMAIL,
      constraintDescription: "Must be an @theguardian.com email address",
      description: "The sender of emails sent using SES.",
    });
  }
}
