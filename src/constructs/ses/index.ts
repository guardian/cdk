import { Duration } from "aws-cdk-lib";
import type { EmailIdentityProps } from "aws-cdk-lib/aws-ses";
import { EmailIdentity, Identity } from "aws-cdk-lib/aws-ses";
import { GuAppAwareConstruct } from "../../utils/mixin/app-aware-construct";
import type { AppIdentity, GuStack } from "../core";
import { GuCname } from "../dns";

export interface GuEmailIdentityProps extends Omit<EmailIdentityProps, "identity">, AppIdentity {
  domainName: string;
}

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
    if (!domainName.endsWith("gutools.co.uk")) {
      throw new Error(
        `Auto verification is only supported for gutools.co.uk domains. ${domainName} is not a gutools.co.uk domain.`
      );
    }

    super(scope, id, {
      identity: Identity.domain(domainName),
      ...props,
    });

    this.dkimRecords.forEach(({ name, value }, index) => {
      new GuCname(scope, `EmailIdentityDkim${index}`, {
        app,
        domainName: name,
        resourceRecord: value,
        ttl: Duration.hours(1),
      });
    });
  }
}
