import { RemovalPolicy } from "aws-cdk-lib";
import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";
import type { CertificateProps } from "aws-cdk-lib/aws-certificatemanager/lib/certificate";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import type { GuDomainName } from "../../types";
import type { GuApp } from "../core";

/**
 * Construct which creates a DNS-validated ACM Certificate.
 *
 * If your DNS is managed via Route 53, then supplying `hostedZoneId` props will allow AWS to automatically
 * validate your certificate.
 *
 * If your DNS is not managed via Route 53, or you omit the `hostedZoneId` props, then the CloudFormation
 * operation which adds this construct will pause until the relevant DNS record has been added manually.
 */
export class GuCertificate extends Certificate {
  constructor(scope: GuApp, props: GuDomainName) {
    const { domainName, hostedZoneId } = props;

    const maybeHostedZone = hostedZoneId ? HostedZone.fromHostedZoneId(scope, "HostedZone", hostedZoneId) : undefined;

    const awsCertificateProps: CertificateProps = {
      domainName,
      validation: CertificateValidation.fromDns(maybeHostedZone),
    };
    super(scope, "Certificate", awsCertificateProps);
    this.applyRemovalPolicy(RemovalPolicy.RETAIN);
  }
}
