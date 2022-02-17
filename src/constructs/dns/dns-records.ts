import type { Duration } from "@aws-cdk/core";
import { CfnResource } from "@aws-cdk/core";
import type { GuDomainName } from "../../types/domain-names";
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
    const { name, recordType, resourceRecords, ttl } = props;
    const { stage } = scope;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- more `RecordType`s will be added soon!
    if (recordType === RecordType.CNAME) {
      /*
      If you try to create a CNAME with multiple records within NS1, you are greeted with:

        According to RFC, a CNAME record should not return multiple answers.
        Doing so may cause problems during resolution.
        If you want to use multiple answers, you should ensure you have the correct filters in place (such as SELECT_FIRST_N 1) to limit them to a single answer at resolution time.

      `Guardian::DNS::RecordSet` does not implement "correct filters", so fail fast by throwing.
       */
      if (resourceRecords.length !== 1) {
        throw new Error(
          "According to RFC, a CNAME record should not return multiple answers. Doing so may cause problems during resolution."
        );
      }
    }

    // The spec for this private resource type can be found here:
    // https://github.com/guardian/cfn-private-resource-types/tree/main/dns/guardian-dns-record-set-type/docs#syntax
    new CfnResource(scope, id, {
      type: "Guardian::DNS::RecordSet",
      properties: {
        Name: name,
        ResourceRecords: resourceRecords,
        RecordType: recordType,
        TTL: ttl.toSeconds(),
        Stage: stage,
      },
    });
  }
}

export interface GuCnameProps extends GuDomainName, AppIdentity {
  /** The record your CNAME should point to, for example your Load Balancer DNS name */
  resourceRecord: string;
  /** The time to live for the DNS record */
  ttl: Duration;
}

/**
 * Construct for creating CNAME records in NS1.
 *
 * See [[`GuCnameProps`]] for configuration options.
 */
export class GuCname extends GuDnsRecordSet {
  constructor(scope: GuStack, id: string, props: GuCnameProps) {
    const { domainName: name, resourceRecord, ttl } = props;

    super(scope, id, {
      name,
      recordType: RecordType.CNAME,
      resourceRecords: [resourceRecord],
      ttl,
    });
  }
}
