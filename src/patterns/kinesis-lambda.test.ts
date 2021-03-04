import { SynthUtils } from "@aws-cdk/assert";
import "@aws-cdk/assert/jest";
import type { StreamProps } from "@aws-cdk/aws-kinesis";
import { StreamEncryption } from "@aws-cdk/aws-kinesis";
import { Runtime, StartingPosition } from "@aws-cdk/aws-lambda";
import { Duration } from "@aws-cdk/core";
import type { SynthedStack } from "../../test/utils";
import { simpleGuStackForTesting } from "../../test/utils";
import type { NoMonitoring } from "../constructs/cloudwatch/no-monitoring";
import type {
  BlockProcessingAndRetryIndefinitely,
  StreamErrorHandlingProps,
  StreamProcessingProps,
} from "../constructs/lambda/event-sources";
import { StreamRetry } from "../constructs/lambda/event-sources";
import { GuKinesisLambda } from "./kinesis-lambda";

describe("The GuKinesisLambda pattern", () => {
  it("should create the correct resources for a new stack with minimal config", () => {
    const stack = simpleGuStackForTesting();
    const blockProcessing: BlockProcessingAndRetryIndefinitely = { blockProcessingAndRetryIndefinitely: true };
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      code: { bucket: "test-dist", key: "lambda.zip" },
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      errorHandlingConfiguration: blockProcessing,
      monitoringConfiguration: noMonitoring,
    };
    new GuKinesisLambda(stack, "my-lambda-function", props);
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should inherit an existing Kinesis stream correctly if logicalIdFromCloudFormation is passed in", () => {
    const stack = simpleGuStackForTesting();
    const blockProcessing: BlockProcessingAndRetryIndefinitely = { blockProcessingAndRetryIndefinitely: true };
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      code: { bucket: "test-dist", key: "lambda.zip" },
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      errorHandlingConfiguration: blockProcessing,
      monitoringConfiguration: noMonitoring,
      existingKinesisStream: { logicalIdFromCloudFormation: "in-use-kinesis-stream" },
    };
    new GuKinesisLambda(stack, "my-lambda-function", props);
    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("in-use-kinesis-stream");
  });

  it("should not generate a new Kinesis stream if an external stream name is passed in", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const blockProcessing: BlockProcessingAndRetryIndefinitely = { blockProcessingAndRetryIndefinitely: true };
    const props = {
      code: { bucket: "test-dist", key: "lambda.zip" },
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: noMonitoring,
      errorHandlingConfiguration: blockProcessing,
      existingKinesisStream: { externalKinesisStreamName: "kinesis-stream-from-another-stack" },
    };
    new GuKinesisLambda(stack, "my-lambda-function", props);
    expect(stack).toHaveResource("AWS::Lambda::EventSourceMapping", {
      EventSourceArn: {
        "Fn::Join": [
          "",
          [
            "arn:aws:kinesis:",
            {
              Ref: "AWS::Region",
            },
            ":",
            {
              Ref: "AWS::AccountId",
            },
            ":stream/kinesis-stream-from-another-stack",
          ],
        ],
      },
    });
    expect(stack).not.toHaveResource("AWS::Kinesis::Stream");
  });

  it("should create an alarm if monitoring configuration is provided", () => {
    const stack = simpleGuStackForTesting();
    const blockProcessing: BlockProcessingAndRetryIndefinitely = { blockProcessingAndRetryIndefinitely: true };
    const props = {
      code: { bucket: "test-dist", key: "lambda.zip" },
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      errorHandlingConfiguration: blockProcessing,
      monitoringConfiguration: {
        toleratedErrorPercentage: 1,
        snsTopicName: "alerts-topic",
      },
    };
    new GuKinesisLambda(stack, "my-lambda-function", props);
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm");
  });

  it("should pass through Kinesis stream properties", () => {
    const stack = simpleGuStackForTesting();
    const blockProcessing: BlockProcessingAndRetryIndefinitely = { blockProcessingAndRetryIndefinitely: true };
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const kinesisStreamProps: StreamProps = {
      streamName: "custom-kinesis-stream-name",
      retentionPeriod: Duration.hours(100),
      shardCount: 3,
      encryption: StreamEncryption.MANAGED,
    };
    const props = {
      code: { bucket: "test-dist", key: "lambda.zip" },
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      errorHandlingConfiguration: blockProcessing,
      monitoringConfiguration: noMonitoring,
      kinesisStreamProps: kinesisStreamProps,
    };
    new GuKinesisLambda(stack, "my-lambda-function", props);
    expect(stack).toHaveResource("AWS::Kinesis::Stream", {
      Name: "custom-kinesis-stream-name",
      RetentionPeriodHours: 100,
      ShardCount: 3,
      StreamEncryption: {
        EncryptionType: "KMS",
        KeyId: "alias/aws/kinesis",
      },
    });
  });

  it("should pass through processing properties", () => {
    const stack = simpleGuStackForTesting();
    const blockProcessing: BlockProcessingAndRetryIndefinitely = { blockProcessingAndRetryIndefinitely: true };
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const processingProps: StreamProcessingProps = {
      batchSize: 11,
      parallelizationFactor: 2,
      startingPosition: StartingPosition.TRIM_HORIZON,
      maxBatchingWindow: Duration.minutes(3),
      enabled: false,
    };
    const props = {
      code: { bucket: "test-dist", key: "lambda.zip" },
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      errorHandlingConfiguration: blockProcessing,
      monitoringConfiguration: noMonitoring,
      processingProps: processingProps,
    };
    new GuKinesisLambda(stack, "my-lambda-function", props);
    expect(stack).toHaveResource("AWS::Lambda::EventSourceMapping", {
      BatchSize: 11,
      ParallelizationFactor: 2,
      StartingPosition: "TRIM_HORIZON",
      MaximumBatchingWindowInSeconds: 180,
      Enabled: false,
    });
  });

  it("should configure error handling correctly based on max number of retry attempts", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const errorHandlingProps: StreamErrorHandlingProps = {
      bisectBatchOnError: true,
      retryBehaviour: StreamRetry.maxAttempts(5),
    };
    const props = {
      code: { bucket: "test-dist", key: "lambda.zip" },
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      errorHandlingConfiguration: errorHandlingProps,
      monitoringConfiguration: noMonitoring,
    };
    new GuKinesisLambda(stack, "my-lambda-function", props);
    expect(stack).toHaveResource("AWS::Lambda::EventSourceMapping", {
      BisectBatchOnFunctionError: true,
      MaximumRetryAttempts: 5,
    });
  });

  it("should configure error handling correctly based on max age of records", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const errorHandlingProps: StreamErrorHandlingProps = {
      bisectBatchOnError: true,
      retryBehaviour: StreamRetry.maxAge(Duration.minutes(5)),
    };
    const props = {
      code: { bucket: "test-dist", key: "lambda.zip" },
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      errorHandlingConfiguration: errorHandlingProps,
      monitoringConfiguration: noMonitoring,
    };
    new GuKinesisLambda(stack, "my-lambda-function", props);
    expect(stack).toHaveResource("AWS::Lambda::EventSourceMapping", {
      BisectBatchOnFunctionError: true,
      MaximumRecordAgeInSeconds: 300,
    });
  });
});
