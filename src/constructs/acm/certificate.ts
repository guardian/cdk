import { Certificate, CertificateValidation } from "@aws-cdk/aws-certificatemanager";
import type { CertificateProps } from "@aws-cdk/aws-certificatemanager/lib/certificate";
import { HostedZone } from "@aws-cdk/aws-route53";
import { RemovalPolicy } from "@aws-cdk/core";
import { Stage } from "../../constants";
import type { GuStack } from "../core";

type GuCertificateProps = Record<Stage, GuDnsValidatedCertificateProps>;

interface GuDnsValidatedCertificateProps {
  domainName: string;
  hostedZoneId: string;
}

export class GuCertificate extends Certificate {
  constructor(scope: GuStack, id: string, props: GuCertificateProps) {
    scope.setStageDependentValue({
      variableName: "domainName",
      stageValues: { [Stage.CODE]: props.CODE.domainName, [Stage.PROD]: props.PROD.domainName },
    });
    scope.setStageDependentValue({
      variableName: "hostedZoneId",
      stageValues: { [Stage.CODE]: props.CODE.hostedZoneId, [Stage.PROD]: props.PROD.hostedZoneId },
    });
    const hostedZone = HostedZone.fromHostedZoneId(scope, "HostedZone", scope.getStageDependentValue("hostedZoneId"));
    const awsCertificateProps: CertificateProps = {
      domainName: scope.getStageDependentValue("domainName"),
      validation: CertificateValidation.fromDns(hostedZone),
    };
    super(scope, id, awsCertificateProps);
    this.applyRemovalPolicy(RemovalPolicy.RETAIN);
  }
}
