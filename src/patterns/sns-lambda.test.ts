import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Runtime } from "@aws-cdk/aws-lambda";
import type { NoMonitoring } from "../constructs/cloudwatch";
import type { SynthedStack } from "../utils/test";
import { simpleGuStackForTesting } from "../utils/test";
import { GuSnsLambda } from "./sns-lambda";

describe("The GuSnsLambda pattern", () => {
  it("should create the correct resources for a new stack with minimal config", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      code: { bucket: "test-dist", key: "lambda.zip" },
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: noMonitoring,
      app: "testing",
    };
    new GuSnsLambda(stack, "my-lambda-function", props);
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should inherit an existing SNS topic correctly if a logicalIdFromCloudFormation is passed via existingSnsTopic", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      code: { bucket: "test-dist", key: "lambda.zip" },
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: noMonitoring,
      existingSnsTopic: { logicalIdFromCloudFormation: "in-use-sns-topic" },
      app: "testing",
    };
    new GuSnsLambda(stack, "my-lambda-function", props);
    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("in-use-sns-topic");
  });

  it("should not generate a new SNS Topic if an externalTopicName is passed via existingSnsTopic", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      code: { bucket: "test-dist", key: "lambda.zip" },
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: noMonitoring,
      existingSnsTopic: { externalTopicName: "sns-topic-from-another-stack" },
      app: "testing",
    };
    new GuSnsLambda(stack, "my-lambda-function", props);
    expect(stack).toHaveResource("AWS::SNS::Subscription");
    expect(stack).not.toHaveResource("AWS::SNS::Topic");
  });

  it("should create an alarm if monitoring configuration is provided", () => {
    const stack = simpleGuStackForTesting();
    const props = {
      code: { bucket: "test-dist", key: "lambda.zip" },
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: {
        toleratedErrorPercentage: 99,
        snsTopicName: "alerts-topic",
      },
      app: "testing",
    };
    new GuSnsLambda(stack, "my-lambda-function", props);
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm");
  });
});
