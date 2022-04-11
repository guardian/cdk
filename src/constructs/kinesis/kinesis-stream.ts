import { Stream } from "aws-cdk-lib/aws-kinesis";
import type { StreamProps } from "aws-cdk-lib/aws-kinesis";
import { GuStatefulMigratableConstruct } from "../../utils/mixin";
import type { GuMigratingResource, GuStack } from "../core";

export interface GuKinesisStreamProps extends StreamProps, GuMigratingResource {}

/**
 * Construct which creates a Kinesis stream.
 *
 * To inherit a Kinesis stream which has already been created via a CloudFormation stack, the `migratedFromCloudFormation`
 * prop on your stack must be set to `true`. You should also pass in the logical id via the `existingLogicalId` prop.
 *
 * For example, when migrating a CloudFormation stack which includes the following resource:
 * ```yaml
 * MyCloudFormedKinesisStream:
 *   Type: AWS::Kinesis::Stream
 * ```
 *
 * Inherit the Kinesis stream (rather than creating a new one) using:
 * ```typescript
 * new GuKinesisStream(stack, "LoggingStream", { existingLogicalId: "MyCloudFormedKinesisStream" });
 * ```
 */
export class GuKinesisStream extends GuStatefulMigratableConstruct(Stream) {
  constructor(scope: GuStack, id: string, props?: GuKinesisStreamProps) {
    super(scope, id, props);
  }
}
