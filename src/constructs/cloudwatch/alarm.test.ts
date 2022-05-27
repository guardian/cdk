import { Template } from "aws-cdk-lib/assertions";
import { ComparisonOperator } from "aws-cdk-lib/aws-cloudwatch";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { simpleTestingResources } from "../../utils/test";
import type { GuApp } from "../core";
import { GuLambdaFunction } from "../lambda";
import { GuAlarm } from "./alarm";

describe("The GuAlarm class", () => {
  const lambda = (scope: GuApp) =>
    new GuLambdaFunction(scope, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
    });

  it("should create a CloudWatch alarm", () => {
    const { stack, app } = simpleTestingResources();
    new GuAlarm(app, "alarm", {
      alarmName: `Alarm in ${stack.stage}`,
      alarmDescription: "It's broken",
      metric: lambda(app).metricErrors(),
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      threshold: 1,
      evaluationPeriods: 1,
      snsTopicName: "alerts-topic",
    });
    Template.fromStack(stack).resourceCountIs("AWS::CloudWatch::Alarm", 1);
  });

  it("should send alerts to the provided SNS Topic", () => {
    const { stack, app } = simpleTestingResources();
    new GuAlarm(app, "alarm", {
      alarmName: `Alarm in ${stack.stage}`,
      alarmDescription: "It's broken",
      metric: lambda(app).metricErrors(),
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      threshold: 1,
      evaluationPeriods: 1,
      snsTopicName: "alerts-topic",
    });
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmActions: [
        {
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
              ":alerts-topic",
            ],
          ],
        },
      ],
    });
  });
});
