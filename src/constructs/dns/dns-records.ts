import { CfnResource } from "@aws-cdk/core";
import type { GuStack } from "../core";

export enum RecordType {
  CNAME = "CNAME",
}

export interface GuDnsRecordSetProps {
  name: string;
  recordType: RecordType;
  resourceRecords: string[];
  ttl?: number;
}

/**
 * Do not use this construct directly. Use [[`GuCname`]] instead in order to reduce boilerplate.
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
        TTL: props.ttl ?? 3600,
        Stage: scope.stage,
      },
    });
  }
}

export interface GuCnameProps {
  /** The name of the record, for example: xyz.example.com */
  name: string;
  /** The record your CNAME should point to, for example your Load Balancer DNS name */
  resourceRecord: string;
  /** The time to live in seconds for the DNS record - this will be set to 3600 seconds (1 hour) by default */
  ttl?: number;
}

/**
 * Construct for creating CNAME records in NS1.
 *
 * See [[`GuCnameProps`]] for configuration options.
 */
export class GuCname extends GuDnsRecordSet {
  constructor(scope: GuStack, id: string, props: GuCnameProps) {
    super(scope, id, {
      recordType: RecordType.CNAME,
      resourceRecords: [props.resourceRecord],
      ...props,
    });
  }
}
