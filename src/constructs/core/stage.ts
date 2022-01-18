import { Certificate, CertificateValidation } from "@aws-cdk/aws-certificatemanager";
import type { CertificateProps } from "@aws-cdk/aws-certificatemanager/lib/certificate";
import { HostedZone } from "@aws-cdk/aws-route53";
import type { CfnMapping } from "@aws-cdk/core";
import { RemovalPolicy } from "@aws-cdk/core";
import { GuStatefulMigratableConstruct } from "../../utils/mixin";
import { GuAppAwareConstruct } from "../../utils/mixin/app-aware-construct";
import type { GuStack } from "../core";
import { AppIdentity } from "../core/identity";
import type { GuMigratingResource } from "../core/migrating";

export type Stage = "CODE" | "PROD";

type StageProp<A> = {
  CODE: A;
  PROD: A;
};

type GuStageMapping = {
  set<A>(name: string, currentStage: Stage, values: StageProp<A>): string;
};

/**
 * NewStageMapping is a wrapper for a Cloudformation mapping
 *
 * Use this to parameterise values by stage. Note, this assumes that you only
 * have two stages, 'CODE' and 'PROD'. Create your own mapping logic if you have
 * special requirements.
 */
export const NewStageMapping = (mapping: CfnMapping): GuStageMapping => {
  return {
    set<A>(name: string, currentStage: Stage, values: StageProp<A>): string {
      for (const [stage, value] of Object.entries(values)) {
        mapping.setValue(stage, name, value);
      }

      return mapping.findInMap(currentStage, name);
    },
  };
};

// -------- Example stack + construct below...

export interface GuDomainNameProps {
  domainName: string;
  hostedZoneId?: string;
}

type GuCertificatePropsWithApp = GuDomainNameProps & AppIdentity & GuMigratingResource;

export class GuCertificateExample extends GuStatefulMigratableConstruct(GuAppAwareConstruct(Certificate)) {
  constructor(scope: GuStack, props: GuCertificatePropsWithApp) {
    const maybeHostedZone = !props.hostedZoneId
      ? undefined
      : HostedZone.fromHostedZoneId(
          scope,
          AppIdentity.suffixText({ app: props.app }, "HostedZone"),
          props.hostedZoneId
        );

    const awsCertificateProps: CertificateProps & GuMigratingResource & AppIdentity = {
      domainName: props.domainName,
      validation: CertificateValidation.fromDns(maybeHostedZone),
      existingLogicalId: props.existingLogicalId,
      app: props.app,
    };
    super(scope, "Certificate", awsCertificateProps);
    this.applyRemovalPolicy(RemovalPolicy.RETAIN);
  }
}
