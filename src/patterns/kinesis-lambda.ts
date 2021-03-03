import type { StreamProps } from "@aws-cdk/aws-kinesis";
import { Stream } from "@aws-cdk/aws-kinesis";
import type { IEventSourceDlq } from "@aws-cdk/aws-lambda";
import { StartingPosition } from "@aws-cdk/aws-lambda";
import type { KinesisEventSourceProps } from "@aws-cdk/aws-lambda-event-sources";
import { KinesisEventSource } from "@aws-cdk/aws-lambda-event-sources";
import { Duration } from "@aws-cdk/core";
import type { GuLambdaErrorPercentageMonitoringProps, NoMonitoring } from "../constructs/cloudwatch";
import type { GuStack } from "../constructs/core";
import type { GuKinesisStreamProps } from "../constructs/kinesis";
import { GuKinesisStream } from "../constructs/kinesis";
import type { GuFunctionProps } from "../constructs/lambda";
import { GuLambdaFunction } from "../constructs/lambda";

export interface ExistingKinesisStream {
  logicalIdFromCloudFormation?: string;
  externalKinesisStreamName?: string;
}

export type StreamProcessingProps = Omit<
  KinesisEventSourceProps,
  "bisectBatchOnError" | "maxRecordAge" | "onFailure" | "retryAttempts"
>;

type AwsErrorHandlingProps = Pick<
  KinesisEventSourceProps,
  "bisectBatchOnError" | "maxRecordAge" | "onFailure" | "retryAttempts"
>;

function toAwsProps(errorHandlingProps: ErrorHandlingProps): AwsErrorHandlingProps {
  return {
    bisectBatchOnError: errorHandlingProps.bisectBatchOnError,
    onFailure: errorHandlingProps.deadLetterQueueForSkippedRecords,
    ...errorHandlingProps.retryBehaviour.toAwsProp(),
  };
}

type AwsRetryProp = Pick<AwsErrorHandlingProps, "maxRecordAge" | "retryAttempts">;
type RetryType = "attempts" | "recordAge";

export class Retry {
  public static maxAttempts(amount: number): Retry {
    return new Retry(amount, "attempts");
  }
  public static maxAge(duration: Duration): Retry {
    return new Retry(duration.toSeconds(), "recordAge");
  }
  public toAwsProp(): AwsRetryProp {
    return this.retryType === "attempts"
      ? { retryAttempts: this.amount }
      : { maxRecordAge: Duration.seconds(this.amount) };
  }
  private readonly amount: number;
  readonly retryType: RetryType;
  // eslint-disable-next-line custom-rules/valid-constructors -- TODO only lint for things that extend IConstruct
  private constructor(amount: number, type: RetryType) {
    this.amount = amount;
    this.retryType = type;
  }
}

export interface ErrorHandlingProps {
  bisectBatchOnError: boolean;
  retryBehaviour: Retry;
  deadLetterQueueForSkippedRecords?: IEventSourceDlq;
  blockProcessingAndRetryIndefinitely?: false;
}

export interface BlockProcessingAndRetryIndefinitely {
  blockProcessingAndRetryIndefinitely: true;
}

export interface GuKinesisLambdaProps extends Omit<GuFunctionProps, "rules" | "apis" | "errorPercentageMonitoring"> {
  monitoringConfiguration: NoMonitoring | GuLambdaErrorPercentageMonitoringProps;
  existingKinesisStream?: ExistingKinesisStream;
  errorHandlingConfiguration: BlockProcessingAndRetryIndefinitely | ErrorHandlingProps;
  kinesisStreamProps?: StreamProps;
  processingProps?: StreamProcessingProps;
}

export class GuKinesisLambda extends GuLambdaFunction {
  constructor(scope: GuStack, id: string, props: GuKinesisLambdaProps) {
    super(scope, id, {
      ...props,
      errorPercentageMonitoring: props.monitoringConfiguration.noMonitoring ? undefined : props.monitoringConfiguration,
    });
    const kinesisProps: GuKinesisStreamProps = {
      overrideId: !!props.existingKinesisStream?.logicalIdFromCloudFormation,
      ...props.kinesisStreamProps,
    };
    const streamId = props.existingKinesisStream?.logicalIdFromCloudFormation ?? "KinesisStream";
    const kinesisStream = props.existingKinesisStream?.externalKinesisStreamName
      ? Stream.fromStreamArn(
          scope,
          streamId,
          `arn:aws:sns:${scope.region}:${scope.account}:${props.existingKinesisStream.externalKinesisStreamName}`
        )
      : new GuKinesisStream(scope, streamId, kinesisProps);

    const errorHandlingPropsToAwsProps = props.errorHandlingConfiguration.blockProcessingAndRetryIndefinitely
      ? undefined
      : toAwsProps(props.errorHandlingConfiguration);

    const eventSourceProps: KinesisEventSourceProps = {
      startingPosition: StartingPosition.LATEST,
      ...props.processingProps,
      ...errorHandlingPropsToAwsProps,
    };
    this.addEventSource(new KinesisEventSource(kinesisStream, eventSourceProps));
  }
}
