import type { StreamProps } from "@aws-cdk/aws-kinesis";
import { Stream } from "@aws-cdk/aws-kinesis";
import { GuStatefulMigratableConstruct } from "../../utils/mixin";
import type { GuStack } from "../core";
import type { GuMigratingResource } from "../core/migrating";

export interface GuKinesisStreamProps extends StreamProps, GuMigratingResource {}

export class GuKinesisStream extends GuStatefulMigratableConstruct(Stream) {
  constructor(scope: GuStack, id: string, props?: GuKinesisStreamProps) {
    super(scope, id, props);
  }
}
