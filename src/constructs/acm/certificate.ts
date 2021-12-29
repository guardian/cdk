import { Certificate, CertificateValidation } from "@aws-cdk/aws-certificatemanager";
import type { CertificateProps } from "@aws-cdk/aws-certificatemanager/lib/certificate";
import { HostedZone } from "@aws-cdk/aws-route53";
import { RemovalPolicy } from "@aws-cdk/core";
import { Stage } from "../../constants";
import type { GuDomainNameProps } from "../../types/domain-names";
import { StageAwareValue } from "../../types/stage";
import { GuStatefulMigratableConstruct } from "../../utils/mixin";
import { GuAppAwareConstruct } from "../../utils/mixin/app-aware-construct";
import type { GuStack } from "../core";
import { AppIdentity } from "../core/identity";
import type { GuMigratingResource } from "../core/migrating";

export type GuCertificatePropsWithApp = GuDomainNameProps & AppIdentity & GuMigratingResource;

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
 *
 * ```typescript
 * new GuCertificate(stack, "TestCertificate", {
 *    app: "testing",
 *    [Stage.CODE]: {
 *      domainName: "code-guardian.com",
 *      hostedZoneId: "id123",
 *    },
 *    [Stage.PROD]: {
 *      domainName: "prod-guardian.com",
 *      hostedZoneId: "id124",
 *    },
 *  });
 *```
 *
 * Example usage for inheriting a certificate which was created via CloudFormation:
 *
 * ```typescript
 * new GuCertificate(stack, "TestCertificate", {
 *    app: "testing",
 *    existingLogicalId: "MyCloudFormedCertificate",
 *    [Stage.CODE]: {
 *      domainName: "code-guardian.com",
 *      hostedZoneId: "id123",
 *    },
 *    [Stage.PROD]: {
 *      domainName: "prod-guardian.com",
 *      hostedZoneId: "id124",
 *    },
 *  });
 *```
 */
export class GuCertificate extends GuStatefulMigratableConstruct(GuAppAwareConstruct(Certificate)) {
  constructor(scope: GuStack, props: GuCertificatePropsWithApp) {
    const hasHostedZoneId: boolean = StageAwareValue.isStageValue(props)
      ? !!props.CODE.hostedZoneId && !!props.PROD.hostedZoneId
      : !!props.INFRA.hostedZoneId;

    const maybeHostedZone = !hasHostedZoneId
      ? undefined
      : HostedZone.fromHostedZoneId(
          scope,
          /* eslint-disable @typescript-eslint/no-non-null-assertion -- `hasHostedZoneId` is true, so we know `hostedZoneId` is present here */
          AppIdentity.suffixText({ app: props.app }, "HostedZone"),
          StageAwareValue.isStageValue(props)
            ? scope.withStageDependentValue({
                app: props.app,
                variableName: "hostedZoneId",
                stageValues: {
                  [Stage.CODE]: props.CODE.hostedZoneId!,
                  [Stage.PROD]: props.PROD.hostedZoneId!,
                },
              })
            : props.INFRA.hostedZoneId!
          /* eslint-enable @typescript-eslint/no-non-null-assertion */
        );

    const awsCertificateProps: CertificateProps & GuMigratingResource & AppIdentity = {
      domainName: StageAwareValue.isStageValue(props)
        ? scope.withStageDependentValue({
            app: props.app,
            variableName: "domainName",
            stageValues: {
              [Stage.CODE]: props.CODE.domainName,
              [Stage.PROD]: props.PROD.domainName,
            },
          })
        : props.INFRA.domainName,
      validation: CertificateValidation.fromDns(maybeHostedZone),
      existingLogicalId: props.existingLogicalId,
      app: props.app,
    };
    super(scope, "Certificate", awsCertificateProps);
    this.applyRemovalPolicy(RemovalPolicy.RETAIN);
  }
}
