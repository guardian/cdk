import { RemovalPolicy } from "aws-cdk-lib";
import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";
import type { CertificateProps } from "aws-cdk-lib/aws-certificatemanager/lib/certificate";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import type { GuDomainName } from "../../types";
import { GuStatefulMigratableConstruct } from "../../utils/mixin";
import { GuAppAwareConstruct } from "../../utils/mixin/app-aware-construct";
import { AppIdentity } from "../core";
import type { GuMigratingResource, GuStack } from "../core";

export type GuCertificatePropsWithApp = GuDomainName & AppIdentity & GuMigratingResource;

/**
 * Construct which creates a DNS-validated ACM Certificate.
 *
 * If your DNS is managed via Route 53, then supplying `hostedZoneId` props will allow AWS to automatically
 * validate your certificate.
 *
 * If your DNS is not managed via Route 53, or you omit the `hostedZoneId` props, then the CloudFormation
 * operation which adds this construct will pause until the relevant DNS record has been added manually.
 *
 * Example usage for creating a new certificate:
 * ```typescript
 * new GuCertificate(stack, "TestCertificate", {
 *   app: "testing",
 *   domainName: "code-guardian.com",
 *   hostedZoneId: "id123",
 * });
 *```
 *
 * Example usage for inheriting a certificate which was created via CloudFormation:
 * ```typescript
 * new GuCertificate(stack, "TestCertificate", {
 *   app: "testing",
 *   existingLogicalId: "MyCloudFormedCertificate",
 *   domainName: "code-guardian.com",
 *   hostedZoneId: "id123",
 * });
 *```
 */
export class GuCertificate extends GuStatefulMigratableConstruct(GuAppAwareConstruct(Certificate)) {
  constructor(scope: GuStack, props: GuCertificatePropsWithApp) {
    const { app, domainName, existingLogicalId, hostedZoneId } = props;

    const maybeHostedZone = hostedZoneId
      ? HostedZone.fromHostedZoneId(scope, AppIdentity.suffixText({ app }, "HostedZone"), hostedZoneId)
      : undefined;

    const awsCertificateProps: CertificateProps & GuMigratingResource & AppIdentity = {
      domainName,
      validation: CertificateValidation.fromDns(maybeHostedZone),
      existingLogicalId,
      app,
    };
    super(scope, "Certificate", awsCertificateProps);
    this.applyRemovalPolicy(RemovalPolicy.RETAIN);
  }
}
