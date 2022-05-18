import { Stream, StreamEncryption } from "aws-cdk-lib/aws-kinesis";
import type { IStream, StreamProps } from "aws-cdk-lib/aws-kinesis";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { KinesisEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import type { KinesisEventSourceProps } from "aws-cdk-lib/aws-lambda-event-sources";
import type { GuLambdaErrorPercentageMonitoringProps, NoMonitoring } from "../constructs/cloudwatch";
import { AppIdentity } from "../constructs/core";
import type { GuStack } from "../constructs/core";
import { GuKinesisStream } from "../constructs/kinesis";
import { GuLambdaFunction } from "../constructs/lambda";
import type { GuFunctionProps } from "../constructs/lambda";
import { toAwsErrorHandlingProps } from "../utils/lambda";
import type { StreamErrorHandlingProps, StreamProcessingProps } from "../utils/lambda";

/**
 * Used to provide information about an existing Kinesis stream to the [[`GuKinesisLambda`]] pattern.
 *
 * Specify a `existingLogicalId` to inherit a Kinesis stream which has already
 * been created via a CloudFormation stack. This is necessary to avoid data loss and interruptions of
 * service when migrating stacks from CloudFormation to `cdk`.
 *
 * Specify an `externalKinesisStreamName` to link the lambda to a Kinesis stream owned by a different stack
 * (or created outside of version control).
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
 * Alternatively, reference a Kinesis stream which belongs to another stack or pattern using:
 * ```typescript
 * existingKinesisStream: { externalKinesisStreamName: "KinesisStreamFromAnotherStack" }
 * ```
 */
export interface ExistingKinesisStream {
  externalKinesisStreamName: string;
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

/**
 * Pattern which creates all of the resources needed to invoke a lambda function whenever a record is
 * put onto a Kinesis stream.
 *
 * This pattern will create a new Kinesis stream by default. If you are migrating a stack from CloudFormation,
 * you will need to opt-out of this behaviour. For information on overriding the default behaviour,
 * see [[`GuKinesisLambdaProps`]].
 *
 * @alpha This pattern is in early development. The API is likely to change in future releases.
 */
export class GuKinesisLambda extends GuLambdaFunction {
  public readonly kinesisStream: IStream;

  constructor(scope: GuStack, id: string, props: GuKinesisLambdaProps) {
    super(scope, id, {
      ...props,
      errorPercentageMonitoring: props.monitoringConfiguration.noMonitoring ? undefined : props.monitoringConfiguration,
    });

    const { account, region } = scope;
    const { existingKinesisStream, kinesisStreamProps } = props;

    this.kinesisStream = existingKinesisStream
      ? Stream.fromStreamArn(
          scope,
          existingKinesisStream.externalKinesisStreamName,
          `arn:aws:kinesis:${region}:${account}:stream/${existingKinesisStream.externalKinesisStreamName}`
        )
      : AppIdentity.taggedConstruct(
          props,
          new GuKinesisStream(scope, "KinesisStream", { encryption: StreamEncryption.MANAGED, ...kinesisStreamProps })
        );

    const errorHandlingPropsToAwsProps = toAwsErrorHandlingProps(props.errorHandlingConfiguration);

    const eventSourceProps: KinesisEventSourceProps = {
      startingPosition: StartingPosition.LATEST,
      ...props.processingProps,
      ...errorHandlingPropsToAwsProps,
    };
    this.addEventSource(new KinesisEventSource(this.kinesisStream, eventSourceProps));
  }
}
