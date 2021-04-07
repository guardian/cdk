import { Certificate, CertificateValidation } from "@aws-cdk/aws-certificatemanager";
import type { CertificateProps } from "@aws-cdk/aws-certificatemanager/lib/certificate";
import { HostedZone } from "@aws-cdk/aws-route53";
import { RemovalPolicy } from "@aws-cdk/core";
import { Stage } from "../../constants";
import type { GuStack } from "../core";
import { AppIdentity } from "../core/identity";
import { GuMigratingResource } from "../core/migrating";
import type { GuStatefulConstruct } from "../core/migrating";

type GuCertificateProps = Record<Stage, GuDnsValidatedCertificateProps> & GuMigratingResource & AppIdentity;

interface GuDnsValidatedCertificateProps {
  domainName: string;
  hostedZoneId?: string;
}

export class GuCertificate extends Certificate implements GuStatefulConstruct {
  isStatefulConstruct: true;
  constructor(scope: GuStack, id: string, props: GuCertificateProps) {
    const maybeHostedZone =
      props.CODE.hostedZoneId && props.PROD.hostedZoneId
        ? HostedZone.fromHostedZoneId(
            scope,
            "HostedZone",
            scope.withStageDependentValue({
              variableName: "hostedZoneId",
              stageValues: { [Stage.CODE]: props.CODE.hostedZoneId, [Stage.PROD]: props.PROD.hostedZoneId },
            })
          )
        : undefined;
    const awsCertificateProps: CertificateProps = {
      domainName: scope.withStageDependentValue({
        variableName: "domainName",
        stageValues: { [Stage.CODE]: props.CODE.domainName, [Stage.PROD]: props.PROD.domainName },
      }),
      validation: CertificateValidation.fromDns(maybeHostedZone),
    };
    super(scope, id, awsCertificateProps);
    this.applyRemovalPolicy(RemovalPolicy.RETAIN);
    this.isStatefulConstruct = true;
    GuMigratingResource.setLogicalId(this, scope, { existingLogicalId: props.existingLogicalId });
    AppIdentity.taggedConstruct({ app: props.app }, this);
  }
}
