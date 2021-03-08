import { RegexPattern } from "../../../constants";
import type { GuStack } from "../stack";
import type { GuNoTypeParameterProps } from "./base";
import { GuStringParameter } from "./base";

export class GuGuardianEmailSenderParameter extends GuStringParameter {
  constructor(scope: GuStack, id: string = "EmailSenderAddress", props?: GuNoTypeParameterProps) {
    super(scope, id, {
      ...props,
      allowedPattern: RegexPattern.GUARDIAN_EMAIL,
      constraintDescription: "Must be an @theguardian.com email address",
    });
  }
}
