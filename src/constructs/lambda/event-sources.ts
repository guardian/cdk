import type { IEventSourceDlq } from "@aws-cdk/aws-lambda";
import type { KinesisEventSourceProps } from "@aws-cdk/aws-lambda-event-sources";
import { Duration } from "@aws-cdk/core";

export type StreamProcessingProps = Omit<
  KinesisEventSourceProps,
  "bisectBatchOnError" | "maxRecordAge" | "onFailure" | "retryAttempts"
>;

/**
 * Use with caution! This will cause your lambda to continuously retry if it encounters errors
 * whilst processing a batch. If the errors are permanent (e.g. due to a bad record) your lambda
 * will fall behind with stream processing i.e. it will only move onto new batches when the problematic
 * records expire. Consider using [[`StreamErrorHandlingProps`]] instead.
 *
 * When using this approach to error handling, ensure that an alarm is configured to monitor
 * lambda failures.
 */
export interface BlockProcessingAndRetryIndefinitely {
  blockProcessingAndRetryIndefinitely: true;
}

/**
 * In order to prevent your lambda from continuously retrying if it encounters errors
 * whilst processing a batch, use `retryBehaviour` to give up on a record once it reaches a certain age,
 * or after a specified number of attempts. See [[`StreamRetry`]] for more details.
 *
 * In order to isolate bad records as part of the retry process, you may also want to bisect problematic batches
 * using bisectBatchOnError. For example:
 *
 * ```typescript
 * const errorHandlingProps: ErrorHandlingProps = {
 *   bisectBatchOnError: true,
 *   retryBehaviour: StreamRetry.maxAttempts(5),
 * }
 * ```
 *
 * Records which could not be processed successfully can (optionally) be sent to a dead letter queue
 * via `deadLetterQueueForSkippedRecords`.
 */
export interface StreamErrorHandlingProps {
  retryBehaviour: StreamRetry;
  bisectBatchOnError: boolean;
  deadLetterQueueForSkippedRecords?: IEventSourceDlq;
  blockProcessingAndRetryIndefinitely?: false;
}

type AwsErrorHandlingProps = Pick<
  KinesisEventSourceProps,
  "bisectBatchOnError" | "maxRecordAge" | "onFailure" | "retryAttempts"
>;

export function toAwsErrorHandlingProps(errorHandlingProps: StreamErrorHandlingProps): AwsErrorHandlingProps {
  return {
    bisectBatchOnError: errorHandlingProps.bisectBatchOnError,
    onFailure: errorHandlingProps.deadLetterQueueForSkippedRecords,
    ...errorHandlingProps.retryBehaviour.toAwsProp(),
  };
}

type AwsRetryProp = Pick<AwsErrorHandlingProps, "maxRecordAge" | "retryAttempts">;
type RetryType = "attempts" | "recordAge";

/**
 * To retry based on number of attempts, use:
 * ```typescript
 * StreamRetry.maxAttempts(5)
 * ```
 *  * To retry based on the age of a record, use:
 * ```typescript
 * StreamRetry.maxAge(Duration.minutes(5))
 * ```
 */
export class StreamRetry {
  public static maxAttempts(amount: number): StreamRetry {
    return new StreamRetry(amount, "attempts");
  }
  public static maxAge(duration: Duration): StreamRetry {
    return new StreamRetry(duration.toSeconds(), "recordAge");
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
