import type { StreamProps } from "@aws-cdk/aws-kinesis";
import { Stream } from "@aws-cdk/aws-kinesis";
import type { GuStack } from "../core";
import { GuMigratingResource } from "../core/migrating";

export interface GuKinesisStreamProps extends StreamProps, GuMigratingResource {}

export class GuKinesisStream extends Stream {
  constructor(scope: GuStack, id: string, props?: GuKinesisStreamProps) {
    super(scope, id, props);
    props && GuMigratingResource.setLogicalId(this, scope, props);
  }
}
