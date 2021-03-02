import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Runtime } from "@aws-cdk/aws-lambda";
import type { SynthedStack } from "../../test/utils";
import { simpleGuStackForTesting } from "../../test/utils";
import type { NoMonitoring } from "../constructs/cloudwatch/no-monitoring";
import { GuKinesisLambda } from "./kinesis-lambda";

describe("The GuKinesisLambda pattern", () => {
  it("should create the correct resources for a new stack with minimal config", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      code: { bucket: "test-dist", key: "lambda.zip" },
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: noMonitoring,
    };
    new GuKinesisLambda(stack, "my-lambda-function", props);
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should inherit an existing Kinesis stream correctly if logicalIdFromCloudFormation is passed in", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      code: { bucket: "test-dist", key: "lambda.zip" },
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
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
    const props = {
      code: { bucket: "test-dist", key: "lambda.zip" },
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: noMonitoring,
      existingKinesisStream: { externalKinesisStreamName: "kinesis-stream-from-another-stack" },
    };
    new GuKinesisLambda(stack, "my-lambda-function", props);
    expect(stack).toHaveResource("AWS::Lambda::EventSourceMapping", {
      EventSourceArn: {
        "Fn::Join": [
          "",
          [
            "arn:aws:sns:",
            {
              Ref: "AWS::Region",
            },
            ":",
            {
              Ref: "AWS::AccountId",
            },
            ":kinesis-stream-from-another-stack",
          ],
        ],
      },
    });
    expect(stack).not.toHaveResource("AWS::Kinesis::Stream");
  });

  it("should create an alarm if monitoring configuration is provided", () => {
    const stack = simpleGuStackForTesting();
    const props = {
      code: { bucket: "test-dist", key: "lambda.zip" },
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: {
        toleratedErrorPercentage: 1,
        snsTopicName: "alerts-topic",
      },
    };
    new GuKinesisLambda(stack, "my-lambda-function", props);
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm");
  });
});
