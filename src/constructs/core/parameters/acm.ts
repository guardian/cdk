import { RegexPattern } from "../../../constants";
import type { GuApp } from "../app";
import { GuStringParameter } from "./base";

// TODO remove?
export class GuCertificateArnParameter extends GuStringParameter {
  constructor(scope: GuApp) {
    super(scope, "TLSCertificate", {
      allowedPattern: RegexPattern.ACM_ARN,
      constraintDescription: "Must be an ACM ARN resource",
      description: "The ARN of an ACM certificate for use on a load balancer",
    });
  }
}
