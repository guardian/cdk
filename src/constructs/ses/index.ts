import { Duration } from "aws-cdk-lib";
import type { EmailIdentityProps } from "aws-cdk-lib/aws-ses";
import { EmailIdentity, Identity } from "aws-cdk-lib/aws-ses";
import type { AppIdentity, GuStack } from "../core";
import { GuCname } from "../dns";

export interface GuEmailIdentityProps extends Omit<EmailIdentityProps, "identity">, AppIdentity {
  domainName: string;
}

export class GuEmailIdentity extends EmailIdentity {
  constructor(scope: GuStack, id: string, props: GuEmailIdentityProps) {
    const { app, domainName } = props;
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
