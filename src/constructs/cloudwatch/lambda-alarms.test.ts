import { Template } from "aws-cdk-lib/assertions";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { simpleTestingResources } from "../../utils/test";
import { GuLambdaFunction } from "../lambda";
import { GuLambdaErrorPercentageAlarm } from "./lambda-alarms";

describe("GuLambdaThrottlingAlarm construct", () => {
  it("should match snapshot", () => {
    const { stack, app } = simpleTestingResources();
    new GuLambdaFunction(app, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      throttlingMonitoring: { snsTopicName: "alerts-topic" },
    });

    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});

describe("The GuLambdaErrorPercentageAlarm construct", () => {
  it("should create the correct alarm resource with minimal config", () => {
    const { stack, app } = simpleTestingResources();
    const lambda = new GuLambdaFunction(app, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
    });
    const props = {
      toleratedErrorPercentage: 80,
      snsTopicName: "alerts-topic",
      lambda: lambda,
    };
    new GuLambdaErrorPercentageAlarm(app, "my-lambda-function", props);
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should adjust the number of evaluation periods if a custom value is provided", () => {
    const { stack, app } = simpleTestingResources();
    const lambda = new GuLambdaFunction(app, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
    });
    const props = {
      toleratedErrorPercentage: 65,
      numberOfMinutesAboveThresholdBeforeAlarm: 12,
      snsTopicName: "alerts-topic",
      lambda: lambda,
    };
    new GuLambdaErrorPercentageAlarm(app, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      EvaluationPeriods: 12,
    });
  });

  it("should use a custom description if one is provided", () => {
    const { stack, app } = simpleTestingResources();
    const lambda = new GuLambdaFunction(app, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
    });
    const props = {
      toleratedErrorPercentage: 65,
      snsTopicName: "alerts-topic",
      alarmDescription: "test-custom-alarm-description",
      lambda: lambda,
    };
    new GuLambdaErrorPercentageAlarm(app, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmDescription: "test-custom-alarm-description",
    });
  });

  it("should use a custom alarm name if one is provided", () => {
    const { stack, app } = simpleTestingResources();
    const lambda = new GuLambdaFunction(app, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
    });
    const props = {
      toleratedErrorPercentage: 65,
      snsTopicName: "alerts-topic",
      lambda: lambda,
      alarmName: "test-custom-alarm-name",
    };
    new GuLambdaErrorPercentageAlarm(app, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "test-custom-alarm-name",
    });
  });
});
