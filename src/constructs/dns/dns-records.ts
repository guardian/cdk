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

export class GuDnsRecordSet {
  constructor(scope: GuStack, id: string, props: GuDnsRecordSetProps) {
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
  name: string;
  resourceRecord: string;
  ttl?: number;
}

export class GuCname extends GuDnsRecordSet {
  constructor(scope: GuStack, id: string, props: GuCnameProps) {
    super(scope, id, {
      recordType: RecordType.CNAME,
      resourceRecords: [props.resourceRecord],
      ...props,
    });
  }
}
