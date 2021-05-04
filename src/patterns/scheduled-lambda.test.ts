import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Schedule } from "@aws-cdk/aws-events";
import { Runtime } from "@aws-cdk/aws-lambda";
import { Duration } from "@aws-cdk/core";
import type { NoMonitoring } from "../constructs/cloudwatch";
import { simpleGuStackForTesting } from "../utils/test";
import { GuJvmScheduledLambda, GuNodeScheduledLambda, GuScheduledLambda } from "./scheduled-lambda";

describe("The GuScheduledLambda pattern", () => {
  it("should create the correct resources with minimal config", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      rules: [{ schedule: Schedule.rate(Duration.minutes(1)) }],
      monitoringConfiguration: noMonitoring,
      app: "testing",
    };
    new GuScheduledLambda(stack, "my-lambda-function", props);
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should create an alarm if monitoring configuration is provided", () => {
    const stack = simpleGuStackForTesting();
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      rules: [{ schedule: Schedule.rate(Duration.minutes(1)) }],
      monitoringConfiguration: {
        toleratedErrorPercentage: 99,
        snsTopicName: "alerts-topic",
      },
      app: "testing",
    };
    new GuScheduledLambda(stack, "my-lambda-function", props);
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm");
  });
});

describe("The GuJvmScheduledLambda class", () => {
  it("should produce a sensible CFN snapshot with minimal configuration", () => {
    const stack = simpleGuStackForTesting();
    new GuJvmScheduledLambda(stack, "jvm-lambda", {
      fileName: "my-app.jar",
      handler: "handler.ts",
      app: "testing",
      rules: [{ schedule: Schedule.rate(Duration.minutes(1)) }],
      monitoringConfiguration: { noMonitoring: true },
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});

describe("The GuNodeScheduledLambda class", () => {
  it("should produce a sensible CFN snapshot with minimal configuration", () => {
    const stack = simpleGuStackForTesting();
    new GuNodeScheduledLambda(stack, "node-lambda", {
      fileName: "my-app.jar",
      handler: "handler.ts",
      app: "testing",
      rules: [{ schedule: Schedule.rate(Duration.minutes(1)) }],
      monitoringConfiguration: { noMonitoring: true },
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});
