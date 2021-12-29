import type { Duration } from "@aws-cdk/core";
import { CfnResource } from "@aws-cdk/core";
import { Stage } from "../../constants";
import type { GuDomainNameProps } from "../../types/domain-names";
import { StageAwareValue } from "../../types/stage";
import type { GuStack } from "../core";
import type { AppIdentity } from "../core/identity";

export enum RecordType {
  CNAME = "CNAME",
}

export interface GuDnsRecordSetProps {
  name: string;
  recordType: RecordType;
  resourceRecords: string[];
  ttl: Duration;
}

/**
 * This construct can be used to create DNS records in NS1.
 *
 * Prefer to use [[`GuCname`]] when creating a CNAME for a CODE or PROD load balancer,
 * as this requires less boilerplate.

 */
export class GuDnsRecordSet {
  constructor(scope: GuStack, id: string, props: GuDnsRecordSetProps) {
    // The spec for this private resource type can be found here:
    // https://github.com/guardian/cfn-private-resource-types/tree/main/dns/guardian-dns-record-set-type/docs#syntax
    new CfnResource(scope, id, {
      type: "Guardian::DNS::RecordSet",
      properties: {
        Name: props.name,
        ResourceRecords: props.resourceRecords,
        RecordType: props.recordType,
        TTL: props.ttl.toSeconds(),
        Stage: scope.stage,
      },
    });
  }
}

export interface GuCnameProps extends AppIdentity {
  /** The name of the records for CODE and PROD stages, for example:
   * ```typescript
   * {
   *   [Stage.CODE]: { domainName: "xyz.code-guardian.com" },
   *   [Stage.PROD]: { domainName: "xyz.prod-guardian.com" },
   * }
   * ```
   */
  domainNameProps: GuDomainNameProps;
  /** The record your CNAME should point to, for example your Load Balancer DNS name */
  resourceRecord: string;
  /** The time to live for the DNS record */
  ttl: Duration;
}

/**
 * Construct for creating CNAME records in NS1.
 *
 * This is designed to create an appropriate CNAME for your CODE and PROD stages, for example when creating a CNAME
 * for your load balancer.
 *
 * If you need something more unusual (e.g. you only need a CNAME for a standalone INFRA stage) you should use the
 * lower-level [[`GuDnsRecordSet`]] class.
 *
 * See [[`GuCnameProps`]] for configuration options.
 */
export class GuCname extends GuDnsRecordSet {
  constructor(scope: GuStack, id: string, props: GuCnameProps) {
    const domainName = StageAwareValue.isStageValue(props.domainNameProps)
      ? scope.withStageDependentValue({
          app: props.app,
          variableName: "domainName",
          stageValues: {
            [Stage.CODE]: props.domainNameProps.CODE.domainName,
            [Stage.PROD]: props.domainNameProps.PROD.domainName,
          },
        })
      : props.domainNameProps.INFRA.domainName;
    super(scope, id, {
      name: domainName,
      recordType: RecordType.CNAME,
      resourceRecords: [props.resourceRecord],
      ttl: props.ttl,
    });
  }
}
