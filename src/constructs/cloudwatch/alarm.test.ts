import "@aws-cdk/assert/jest";
import { ComparisonOperator } from "@aws-cdk/aws-cloudwatch";
import { Runtime } from "@aws-cdk/aws-lambda";
import { simpleGuStackForTesting } from "../../../test/utils";
import { GuLambdaFunction } from "../lambda";
import { GuAlarm } from "./alarm";

describe("The GuAlarm class", () => {
  it("should create a CloudWatch alarm", () => {
    const stack = simpleGuStackForTesting();
    const lambda = new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
    });
    new GuAlarm(stack, "alarm", {
      alarmName: `Alarm in ${stack.stage}`,
      alarmDescription: "It's broken",
      metric: lambda.metricErrors(),
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      threshold: 1,
      evaluationPeriods: 1,
      snsTopicArn: "arn:aws:sns:eu-west-1:123456789012:alerts-topic",
    });
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm");
  });

  it("should send alerts to the provided SNS Topic", () => {
    const stack = simpleGuStackForTesting();
    const lambda = new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
    });
    new GuAlarm(stack, "alarm", {
      alarmName: `Alarm in ${stack.stage}`,
      alarmDescription: "It's broken",
      metric: lambda.metricErrors(),
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      threshold: 1,
      evaluationPeriods: 1,
      snsTopicArn: "arn:aws:sns:eu-west-1:123456789012:alerts-topic",
    });
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm", {
      AlarmActions: ["arn:aws:sns:eu-west-1:123456789012:alerts-topic"],
    });
  });
});
