import type { Duration } from "aws-cdk-lib";
import { CfnResource } from "aws-cdk-lib";
import { Construct } from "constructs";
import type { GuDomainName } from "../../types";
import type { AppIdentity, GuStack } from "../core";

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
 * Prefer to use [[`GuCname`]] when creating a CNAME for a load balancer,
 * as this requires less boilerplate.
 */
export class GuDnsRecordSet extends Construct {
  constructor(scope: GuStack, id: string, props: GuDnsRecordSetProps) {
    const { name, recordType, resourceRecords, ttl } = props;
    const { stage } = scope;

    /*
    Nodes in the CDK tree must have a unique ID. This class adds two nodes to the tree, so we have two IDs.
    `id`, by definition, must be unique. `name` represents a fully qualified domain name, which must also be unique.
    `id` being given to the level 1 construct means it also becomes the logicalId in the template.
     */
    const level2ConstructId = name;
    const level1ConstructId = id;

    super(scope, level2ConstructId);

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
    new CfnResource(scope, level1ConstructId, {
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
