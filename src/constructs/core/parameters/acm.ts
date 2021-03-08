import { RegexPattern } from "../../../constants";
import type { GuStack } from "../stack";
import type { GuNoTypeParameterProps } from "./base";
import { GuStringParameter } from "./base";

export class GuCertificateArnParameter extends GuStringParameter {
  constructor(scope: GuStack, id: string = "TLSCertificate", props?: GuNoTypeParameterProps) {
    super(scope, id, {
      ...props,
      allowedPattern: RegexPattern.ACM_ARN,
      constraintDescription: "Must be an ACM ARN resource",
    });
  }
}
