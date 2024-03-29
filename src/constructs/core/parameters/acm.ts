import { RegexPattern } from "../../../constants";
import { AppIdentity } from "../identity";
import type { GuStack } from "../stack";
import { GuStringParameter } from "./base";

export class GuCertificateArnParameter extends GuStringParameter {
  constructor(scope: GuStack, props: AppIdentity) {
    super(scope, AppIdentity.suffixText(props, "TLSCertificate"), {
      allowedPattern: RegexPattern.ACM_ARN,
      constraintDescription: "Must be an ACM ARN resource",
      description: "The ARN of an ACM certificate for use on a load balancer",
    });
  }
}
