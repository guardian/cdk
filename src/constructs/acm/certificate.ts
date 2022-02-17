import { Certificate, CertificateValidation } from "@aws-cdk/aws-certificatemanager";
import type { CertificateProps } from "@aws-cdk/aws-certificatemanager/lib/certificate";
import { HostedZone } from "@aws-cdk/aws-route53";
import { RemovalPolicy } from "@aws-cdk/core";
import type { GuDomainName } from "../../types/domain-names";
import { GuStatefulMigratableConstruct } from "../../utils/mixin";
import { GuAppAwareConstruct } from "../../utils/mixin/app-aware-construct";
import type { GuStack } from "../core";
import { AppIdentity } from "../core/identity";
import type { GuMigratingResource } from "../core/migrating";

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
