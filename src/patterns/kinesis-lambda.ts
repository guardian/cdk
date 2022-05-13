import { Stream, StreamEncryption } from "aws-cdk-lib/aws-kinesis";
import type { IStream, StreamProps } from "aws-cdk-lib/aws-kinesis";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { KinesisEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import type { KinesisEventSourceProps } from "aws-cdk-lib/aws-lambda-event-sources";
import type { GuLambdaErrorPercentageMonitoringProps, NoMonitoring } from "../constructs/cloudwatch";
import { AppIdentity } from "../constructs/core";
import type { GuMigratingResource, GuStack } from "../constructs/core";
import { guAssumeRolePolicyStatement } from "../constructs/iam";
import { GuKinesisStream } from "../constructs/kinesis";
import type { GuKinesisStreamProps } from "../constructs/kinesis";
import { GuLambdaFunction } from "../constructs/lambda";
import type { GuFunctionProps } from "../constructs/lambda";
import { toAwsErrorHandlingProps } from "../utils/lambda";
import type { StreamErrorHandlingProps, StreamProcessingProps } from "../utils/lambda";

/**
 * Used to provide information about an existing cross account Kinesis stream to the [[`ExistingKinesisStream`]] pattern.
 */
export interface CrossAccountKinesisStream {
  /**
   * cross account role that is used to assume the role in the current stack by adding an sts:AssumeRole policy
   */
  roleArn: string;
  /**
   * cross account kinesis stream Arn that is used for EventSourceMapping
   */
  streamArn: string;
}

/**
 * Used to provide information about an existing Kinesis stream to the [[`GuKinesisLambda`]] pattern.
 *
 * Specify a `existingLogicalId` to inherit a Kinesis stream which has already
 * been created via a CloudFormation stack. This is necessary to avoid data loss and interruptions of
 * service when migrating stacks from CloudFormation to `cdk`.
 *
 * Specify an `externalKinesisStreamName` to link the lambda to a Kinesis stream owned by a different stack
 * on the same aws account (or created outside of version control).
 *
 * Specify an `crossAccountKinesisStream` to link the lambda to a Kinesis stream owned by a different stack
 * on a different aws account (or created outside of version control).
 * For more details and example usage, see [[`CrossAccountKinesisStream`]].
 *
 * **Example Usage**
 *
 * When migrating a CloudFormation stack which includes the following resource:
 * ```yaml
 * MyCloudFormedKinesisStream:
 *   Type: AWS::Kinesis::Stream
 * ```
 * Inherit the Kinesis stream (rather than creating a new one) using:
 * ```typescript
 * existingKinesisStream: { existingLogicalId: "MyCloudFormedKinesisStream" }
 * ```
 *
 * Alternatively, reference a Kinesis stream which belongs to another stack or pattern in the same aws account using:
 * ```typescript
 * existingKinesisStream: { externalKinesisStreamName: "KinesisStreamFromAnotherStack" }
 * ```
 *
 *  Alternatively, reference a Kinesis stream which belongs to another stack or pattern in a different aws account using:
 * ```typescript
 * existingKinesisStream: {
 *   crossAccountKinesisStream: {
 *      roleArn: "CrossAccountKinesisStreamRoleArn",
 *      streamArn: "CrossAccountKinesisStreamArn",
 *   }
 * }
 * ```
 */
export interface ExistingKinesisStream extends GuMigratingResource {
  externalKinesisStreamName?: string;
  crossAccountKinesisStream?: CrossAccountKinesisStream;
}

/**
 * Configuration options for the [[`GuKinesisLambda`]] pattern.
 *
 * For all lambda function configuration options, see [[`GuFunctionProps`]].
 *
 * The `existingKinesisStream` property can be used to inherit or reference a Kinesis stream which
 * has been created outside of this pattern (i.e. via CloudFormation, or via a different `cdk` pattern, or stack).
 * For more details and example usage, see [[`ExistingKinesisStream`]].
 * If this property is omitted, the [[`GuKinesisLambda`]] pattern will create a new stream.
 *
 * If you have specific stream configuration requirements (e.g. data retention period), these can be set via
 * `kinesisStreamProps`.
 *
 * If you need to override the default stream processing options (e.g. batch size and parallelization), pass
 * [[`StreamProcessingProps`]] via `processingProps`.
 *
 * You must provide `errorHandlingConfiguration` to this pattern. Retry conditions can be configured
 * via [[`StreamErrorHandlingProps`]].
 *
 * It is advisable to configure an alarm based on the lambda's error percentage.
 * To do this, add the `monitoringConfiguration` property. The required properties for this are:
 *
 * ```typescript
 * monitoringConfiguration: {
 *   toleratedErrorPercentage: <sensible_error_percentage_threshold>,
 *   snsTopicName: "my-topic-for-cloudwatch-alerts",
 * }
 * ```
 * Other alarm properties (e.g. alarm name and description) will be pre-populated with sensible defaults.
 * For a full list of optional properties, see [[`GuLambdaErrorPercentageMonitoringProps`]].
 *
 * If your team do not use CloudWatch, it's possible to opt-out with the following configuration:
 * ```typescript
 *  monitoringConfiguration: { noMonitoring: true } as NoMonitoring
 * ```
 */
export interface GuKinesisLambdaProps extends Omit<GuFunctionProps, "errorPercentageMonitoring"> {
  monitoringConfiguration: NoMonitoring | GuLambdaErrorPercentageMonitoringProps;
  existingKinesisStream?: ExistingKinesisStream;
  errorHandlingConfiguration: StreamErrorHandlingProps;
  kinesisStreamProps?: StreamProps;
  processingProps?: StreamProcessingProps;
}

const getStream = (scope: GuStack, props: GuKinesisLambdaProps): IStream => {
  const streamId = props.existingKinesisStream?.existingLogicalId?.logicalId ?? "KinesisStream";
  if (props.existingKinesisStream?.externalKinesisStreamName) {
    return Stream.fromStreamArn(
      scope,
      streamId,
      `arn:aws:kinesis:${scope.region}:${scope.account}:stream/${props.existingKinesisStream.externalKinesisStreamName}`
    );
  } else if (props.existingKinesisStream?.crossAccountKinesisStream) {
    return Stream.fromStreamArn(scope, streamId, props.existingKinesisStream.crossAccountKinesisStream.streamArn);
  } else {
    const kinesisProps: GuKinesisStreamProps = {
      existingLogicalId: props.existingKinesisStream?.existingLogicalId,
      encryption: StreamEncryption.MANAGED,
      ...props.kinesisStreamProps,
    };
    return AppIdentity.taggedConstruct(props, new GuKinesisStream(scope, streamId, kinesisProps));
  }
};

/**
 * Pattern which creates all of the resources needed to invoke a lambda function whenever a record is
 * put onto a Kinesis stream.
 *
 * This pattern will create a new Kinesis stream by default. If you are migrating a stack from CloudFormation,
 * you will need to opt-out of this behaviour. For information on overriding the default behaviour,
 * see [[`GuKinesisLambdaProps`]].
 */
export class GuKinesisLambda extends GuLambdaFunction {
  constructor(scope: GuStack, id: string, props: GuKinesisLambdaProps) {
    super(scope, id, {
      ...props,
      errorPercentageMonitoring: props.monitoringConfiguration.noMonitoring ? undefined : props.monitoringConfiguration,
    });

    const kinesisStream = getStream(scope, props);

    if (props.existingKinesisStream?.crossAccountKinesisStream) {
      this.addToRolePolicy(
        guAssumeRolePolicyStatement([props.existingKinesisStream.crossAccountKinesisStream.roleArn])
      );
    }

    const errorHandlingPropsToAwsProps = toAwsErrorHandlingProps(props.errorHandlingConfiguration);

    const eventSourceProps: KinesisEventSourceProps = {
      startingPosition: StartingPosition.LATEST,
      ...props.processingProps,
      ...errorHandlingPropsToAwsProps,
    };
    this.addEventSource(new KinesisEventSource(kinesisStream, eventSourceProps));
  }
}
