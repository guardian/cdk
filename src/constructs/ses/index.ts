import { Duration } from "aws-cdk-lib";
import type { EmailIdentityProps } from "aws-cdk-lib/aws-ses";
import { EmailIdentity, Identity } from "aws-cdk-lib/aws-ses";
import { GuAppAwareConstruct } from "../../utils/mixin/app-aware-construct";
import type { AppIdentity, GuStack } from "../core";
import { GuCname } from "../dns";

/**
 * Properties for the GuEmailIdentity construct
 * domainName: The domain name to use for this identity
 * The domain name must be one of GuEmailIdentity.validDomains
 * @see https://github.com/guardian/dns-validation-lambda/blob/main/README.md
 */
export interface GuEmailIdentityProps extends Omit<EmailIdentityProps, "identity">, AppIdentity {
  domainName: string;
}

// TODO: Expand this list as we add more domains
const validDomains = [
  "gutools.co.uk",
  "dev-gutools.co.uk",
  "guardianapis.com",
  "dev-guardianapis.com",
  "guardianapps.co.uk",
];

/**
 * A construct to create an SES email identity.
 * It also creates the required DNS records to verify the identity.
 * @see https://docs.aws.amazon.com/ses/latest/DeveloperGuide/verify-domains.html
 * @see https://docs.aws.amazon.com/ses/latest/DeveloperGuide/send-email-identity.html
 *
 * @example
 * new GuEmailIdentity(stack, "MyEmailIdentity", {
 *  domainName: "my-service.gutools.co.uk",
 *  app: "test",
 * });
 **/
export class GuEmailIdentity extends GuAppAwareConstruct(EmailIdentity) {
  constructor(scope: GuStack, id: string, props: GuEmailIdentityProps) {
    const { app, domainName } = props;

    if (!validDomains.some((validDomain) => domainName.endsWith(validDomain))) {
      throw new Error(`Auto verification is only supported for certain domains. ${domainName} is not supported.`);
    }

    super(scope, id, {
      identity: Identity.domain(domainName),
      ...props,
    });

    this.dkimRecords.forEach(({ name, value }, index) => {
      new GuCname(scope, `EmailIdentityDkim-${app}-${index}`, {
        app,
        domainName: name,
        resourceRecord: value,
        ttl: Duration.hours(1),
      });
    });
  }

  static get validDomains(): string[] {
    return validDomains;
  }
}
