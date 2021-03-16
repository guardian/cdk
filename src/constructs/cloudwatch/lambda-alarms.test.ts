import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Runtime } from "@aws-cdk/aws-lambda";
import { simpleGuStackForTesting } from "../../../test/utils";
import { GuLambdaFunction } from "../lambda";
import { GuLambdaErrorPercentageAlarm } from "./lambda-alarms";

describe("The GuLambdaErrorPercentageAlarm pattern", () => {
  it("should create the correct alarm resource with minimal config", () => {
    const stack = simpleGuStackForTesting();
    const lambda = new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });
    const props = {
      toleratedErrorPercentage: 80,
      snsTopicName: "alerts-topic",
      lambda: lambda,
    };
    new GuLambdaErrorPercentageAlarm(stack, "my-lambda-function", props);
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should adjust the number of evaluation periods if a custom value is provided", () => {
    const stack = simpleGuStackForTesting();
    const lambda = new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });
    const props = {
      toleratedErrorPercentage: 65,
      numberOfFiveMinutePeriodsToEvaluate: 12,
      snsTopicName: "alerts-topic",
      lambda: lambda,
    };
    new GuLambdaErrorPercentageAlarm(stack, "my-lambda-function", props);
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm", {
      EvaluationPeriods: 12,
    });
  });

  it("should use a custom description if one is provided", () => {
    const stack = simpleGuStackForTesting();
    const lambda = new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });
    const props = {
      toleratedErrorPercentage: 65,
      numberOfFiveMinutePeriodsToEvaluate: 12,
      snsTopicName: "alerts-topic",
      alarmDescription: "test-custom-alarm-description",
      lambda: lambda,
    };
    new GuLambdaErrorPercentageAlarm(stack, "my-lambda-function", props);
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm", {
      AlarmDescription: "test-custom-alarm-description",
    });
  });

  it("should use a custom alarm name if one is provided", () => {
    const stack = simpleGuStackForTesting();
    const lambda = new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });
    const props = {
      toleratedErrorPercentage: 65,
      numberOfFiveMinutePeriodsToEvaluate: 12,
      snsTopicName: "alerts-topic",
      lambda: lambda,
      alarmName: "test-custom-alarm-name",
    };
    new GuLambdaErrorPercentageAlarm(stack, "my-lambda-function", props);
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm", {
      AlarmName: "test-custom-alarm-name",
    });
  });
});
