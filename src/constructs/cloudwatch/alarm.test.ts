import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { ComparisonOperator } from "@aws-cdk/aws-cloudwatch";
import { Runtime } from "@aws-cdk/aws-lambda";
import { Stage } from "../../constants";
import { simpleGuStackForTesting } from "../../utils/test";
import type { SynthedStack } from "../../utils/test";
import type { GuStack } from "../core";
import { GuLambdaFunction } from "../lambda";
import { GuAlarm } from "./alarm";

describe("The GuAlarm class", () => {
  const lambda = (stack: GuStack) =>
    new GuLambdaFunction(stack, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });

  it("should create a CloudWatch alarm", () => {
    const stack = simpleGuStackForTesting();
    new GuAlarm(stack, "alarm", {
      app: "testing",
      alarmName: `Alarm in ${stack.stage}`,
      alarmDescription: "It's broken",
      metric: lambda(stack).metricErrors(),
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      threshold: 1,
      evaluationPeriods: 1,
      snsTopicName: "alerts-topic",
    });
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm");
  });

  it("should send alerts to the provided SNS Topic", () => {
    const stack = simpleGuStackForTesting();
    new GuAlarm(stack, "alarm", {
      app: "testing",
      alarmName: `Alarm in ${stack.stage}`,
      alarmDescription: "It's broken",
      metric: lambda(stack).metricErrors(),
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

  it("can be made stage aware", () => {
    const stack = simpleGuStackForTesting();
    const app = "testing";
    new GuAlarm(stack, "alarm", {
      app,
      alarmName: `Alarm in ${stack.stage}`,
      alarmDescription: "It's broken",
      metric: lambda(stack).metricErrors(),
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      threshold: 1,
      evaluationPeriods: 1,
      snsTopicName: "alerts-topic",
      actionsEnabled: stack.withStageDependentValue({
        app,
        variableName: "alarmActionsEnabled",
        stageValues: {
          [Stage.CODE]: false,
          [Stage.PROD]: true,
        },
      }),
    });
    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(json.Mappings).toEqual({
      testing: {
        CODE: {
          alarmActionsEnabled: false,
        },
        PROD: {
          alarmActionsEnabled: true,
        },
      },
    });

    expect(stack).toHaveResource("AWS::CloudWatch::Alarm", {
      ActionsEnabled: { "Fn::FindInMap": [app, { Ref: "Stage" }, "alarmActionsEnabled"] },
    });
  });
});
