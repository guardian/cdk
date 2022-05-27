import { Duration } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import type { StreamProps } from "aws-cdk-lib/aws-kinesis";
import { StreamEncryption } from "aws-cdk-lib/aws-kinesis";
import { Runtime, StartingPosition } from "aws-cdk-lib/aws-lambda";
import type { NoMonitoring } from "../constructs/cloudwatch";
import { StreamRetry } from "../utils/lambda";
import type { StreamErrorHandlingProps, StreamProcessingProps } from "../utils/lambda";
import { GuTemplate, simpleTestingResources } from "../utils/test";
import { GuKinesisLambda } from "./kinesis-lambda";

describe("The GuKinesisLambda pattern", () => {
  it("should create the correct resources for a new stack with minimal config", () => {
    const { stack, app } = simpleTestingResources();
    const basicErrorHandling: StreamErrorHandlingProps = {
      bisectBatchOnError: false,
      retryBehaviour: StreamRetry.maxAttempts(1),
    };
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      errorHandlingConfiguration: basicErrorHandling,
      monitoringConfiguration: noMonitoring,
    };
    new GuKinesisLambda(app, "my-lambda-function", props);
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should inherit an existing Kinesis stream correctly if an existingLogicalId is passed via existingSnsTopic in a migrating stack", () => {
    const { stack, app } = simpleTestingResources();
    const basicErrorHandling: StreamErrorHandlingProps = {
      bisectBatchOnError: false,
      retryBehaviour: StreamRetry.maxAttempts(1),
    };
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      errorHandlingConfiguration: basicErrorHandling,
      monitoringConfiguration: noMonitoring,
    };
    const { kinesisStream } = new GuKinesisLambda(app, "my-lambda-function", props);
    stack.overrideLogicalId(kinesisStream, { logicalId: "pre-existing-kinesis-stream", reason: "testing" });
    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::Kinesis::Stream", "pre-existing-kinesis-stream");
  });

  it("should not generate a new Kinesis stream if an external stream name is passed in", () => {
    const { stack, app } = simpleTestingResources();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const basicErrorHandling: StreamErrorHandlingProps = {
      bisectBatchOnError: false,
      retryBehaviour: StreamRetry.maxAttempts(1),
    };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: noMonitoring,
      errorHandlingConfiguration: basicErrorHandling,
      existingKinesisStream: { externalKinesisStreamName: "kinesis-stream-from-another-stack" },
    };
    new GuKinesisLambda(app, "my-lambda-function", props);

    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::Lambda::EventSourceMapping", {
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
    template.resourceCountIs("AWS::Kinesis::Stream", 0);
  });

  it("should create an alarm if monitoring configuration is provided", () => {
    const { stack, app } = simpleTestingResources();
    const basicErrorHandling: StreamErrorHandlingProps = {
      bisectBatchOnError: false,
      retryBehaviour: StreamRetry.maxAttempts(1),
    };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      errorHandlingConfiguration: basicErrorHandling,
      monitoringConfiguration: {
        toleratedErrorPercentage: 1,
        snsTopicName: "alerts-topic",
      },
    };
    new GuKinesisLambda(app, "my-lambda-function", props);
    Template.fromStack(stack).resourceCountIs("AWS::CloudWatch::Alarm", 1);
  });

  it("should use managed encryption by default", () => {
    const { stack, app } = simpleTestingResources();
    const basicErrorHandling: StreamErrorHandlingProps = {
      bisectBatchOnError: false,
      retryBehaviour: StreamRetry.maxAttempts(1),
    };
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      errorHandlingConfiguration: basicErrorHandling,
      monitoringConfiguration: noMonitoring,
    };
    new GuKinesisLambda(app, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::Kinesis::Stream", {
      StreamEncryption: {
        EncryptionType: "KMS",
        KeyId: "alias/aws/kinesis",
      },
    });
  });

  it("should override the default encryption type if encryption is explicitly set", () => {
    const { stack, app } = simpleTestingResources();
    const basicErrorHandling: StreamErrorHandlingProps = {
      bisectBatchOnError: false,
      retryBehaviour: StreamRetry.maxAttempts(1),
    };
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      errorHandlingConfiguration: basicErrorHandling,
      monitoringConfiguration: noMonitoring,
      kinesisStreamProps: {
        encryption: StreamEncryption.UNENCRYPTED,
      },
    };
    new GuKinesisLambda(app, "my-lambda-function", props);

    Template.fromStack(stack).hasResourceProperties("AWS::Kinesis::Stream", {
      StreamEncryption: Match.absent(),
    });
  });

  it("should pass through other Kinesis stream properties", () => {
    const { stack, app } = simpleTestingResources();
    const basicErrorHandling: StreamErrorHandlingProps = {
      bisectBatchOnError: false,
      retryBehaviour: StreamRetry.maxAttempts(1),
    };
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const kinesisStreamProps: StreamProps = {
      streamName: "custom-kinesis-stream-name",
      retentionPeriod: Duration.hours(100),
      shardCount: 3,
    };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      errorHandlingConfiguration: basicErrorHandling,
      monitoringConfiguration: noMonitoring,
      kinesisStreamProps: kinesisStreamProps,
    };
    new GuKinesisLambda(app, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::Kinesis::Stream", {
      Name: "custom-kinesis-stream-name",
      RetentionPeriodHours: 100,
      ShardCount: 3,
    });
  });

  it("should pass through processing properties", () => {
    const { stack, app } = simpleTestingResources();
    const basicErrorHandling: StreamErrorHandlingProps = {
      bisectBatchOnError: false,
      retryBehaviour: StreamRetry.maxAttempts(1),
    };
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const processingProps: StreamProcessingProps = {
      batchSize: 11,
      parallelizationFactor: 2,
      startingPosition: StartingPosition.TRIM_HORIZON,
      maxBatchingWindow: Duration.minutes(3),
      enabled: false,
    };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      errorHandlingConfiguration: basicErrorHandling,
      monitoringConfiguration: noMonitoring,
      processingProps: processingProps,
    };
    new GuKinesisLambda(app, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::EventSourceMapping", {
      BatchSize: 11,
      ParallelizationFactor: 2,
      StartingPosition: "TRIM_HORIZON",
      MaximumBatchingWindowInSeconds: 180,
      Enabled: false,
    });
  });

  it("should configure error handling correctly based on max number of retry attempts", () => {
    const { stack, app } = simpleTestingResources();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const errorHandlingProps: StreamErrorHandlingProps = {
      bisectBatchOnError: true,
      retryBehaviour: StreamRetry.maxAttempts(5),
    };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      errorHandlingConfiguration: errorHandlingProps,
      monitoringConfiguration: noMonitoring,
    };
    new GuKinesisLambda(app, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::EventSourceMapping", {
      BisectBatchOnFunctionError: true,
      MaximumRetryAttempts: 5,
    });
  });

  it("should configure error handling correctly based on max age of records", () => {
    const { stack, app } = simpleTestingResources();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const errorHandlingProps: StreamErrorHandlingProps = {
      bisectBatchOnError: true,
      retryBehaviour: StreamRetry.maxAge(Duration.minutes(5)),
    };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      errorHandlingConfiguration: errorHandlingProps,
      monitoringConfiguration: noMonitoring,
    };
    new GuKinesisLambda(app, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::EventSourceMapping", {
      BisectBatchOnFunctionError: true,
      MaximumRecordAgeInSeconds: 300,
    });
  });
});
