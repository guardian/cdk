import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { ComparisonOperator } from "@aws-cdk/aws-cloudwatch";
import { Runtime } from "@aws-cdk/aws-lambda";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuLambdaFunction } from "../lambda";
import { GuAlarm } from "./alarm";
import type { SynthedStack } from "../../utils/test";

describe("The GuAlarm class", () => {
  it("should create a CloudWatch alarm", () => {
    const stack = simpleGuStackForTesting();
    const lambda = new GuLambdaFunction(stack, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });
    new GuAlarm(stack, "alarm", {
      alarmName: `Alarm in ${stack.stage}`,
      alarmDescription: "It's broken",
      metric: lambda.metricErrors(),
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      threshold: 1,
      evaluationPeriods: 1,
      snsTopicName: "alerts-topic",
    });
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm");
  });

  it("should send alerts to the provided SNS Topic", () => {
    const stack = simpleGuStackForTesting();
    const lambda = new GuLambdaFunction(stack, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });
    new GuAlarm(stack, "alarm", {
      alarmName: `Alarm in ${stack.stage}`,
      alarmDescription: "It's broken",
      metric: lambda.metricErrors(),
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      threshold: 1,
      evaluationPeriods: 1,
      snsTopicName: "alerts-topic",
    });
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm", {
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

  it("should enable alarm actions in PROD and disable them in CODE, by default", () => {
    const stack = simpleGuStackForTesting();
    const lambda = new GuLambdaFunction(stack, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });
    new GuAlarm(stack, "alarm", {
      alarmName: `Alarm in ${stack.stage}`,
      alarmDescription: "It's broken",
      metric: lambda.metricErrors(),
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      threshold: 1,
      evaluationPeriods: 1,
      snsTopicName: "alerts-topic",
    });
    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(json.Mappings).toEqual({
      stagemapping: {
        CODE: {
          alarmActionsEnabled: false,
        },
        PROD: {
          alarmActionsEnabled: true,
        },
      },
    });
  });

  it("should allow users to manually enable alarm notifications in CODE", () => {
    const stack = simpleGuStackForTesting();
    const lambda = new GuLambdaFunction(stack, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });
    new GuAlarm(stack, "alarm", {
      actionsEnabledInCode: true,
      alarmName: `Alarm in ${stack.stage}`,
      alarmDescription: "It's broken",
      metric: lambda.metricErrors(),
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      threshold: 1,
      evaluationPeriods: 1,
      snsTopicName: "alerts-topic",
    });
    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(json.Mappings).toEqual({
      stagemapping: {
        CODE: {
          alarmActionsEnabled: true,
        },
        PROD: {
          alarmActionsEnabled: true,
        },
      },
    });
  });
});
