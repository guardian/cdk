import { suite, test } from "node:test";
import { Duration } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { RuleTargetInput, Schedule } from "aws-cdk-lib/aws-events";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import type { NoMonitoring } from "../constructs/cloudwatch";
import { simpleGuStackForTesting } from "../utils/test";
import { GuScheduledLambda } from "./scheduled-lambda";

suite("The GuScheduledLambda pattern", () => {
  test("should create the correct resources with minimal config", (t) => {
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
    t.assert.snapshot(Template.fromStack(stack).toJSON());
  });

  test("should create an alarm if monitoring configuration is provided", () => {
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
    Template.fromStack(stack).resourceCountIs("AWS::CloudWatch::Alarm", 1);
  });

  test("should invoke $LATEST (i.e. an unpublished version) if the enableVersioning prop is unset", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_16_X,
      rules: [{ schedule: Schedule.rate(Duration.minutes(1)) }],
      monitoringConfiguration: noMonitoring,
      app: "testing",
    };
    new GuScheduledLambda(stack, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::Events::Rule", {
      Targets: [
        {
          Arn: { "Fn::GetAtt": ["mylambdafunction8D341B54", "Arn"] },
        },
      ],
    });
  });

  test("should invoke an alias if the enableVersioning prop is set to true", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      enableVersioning: true,
      fileName: "build123.jar",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_16_X,
      rules: [{ schedule: Schedule.rate(Duration.minutes(1)) }],
      monitoringConfiguration: noMonitoring,
      app: "testing",
    };
    new GuScheduledLambda(stack, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::Events::Rule", {
      Targets: [
        {
          Arn: { Ref: "mylambdafunctionAliasForLambdaF2F98ED5" },
        },
      ],
    });
  });

  test("should create the correct resources with an input in the rule", (t) => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      rules: [{ schedule: Schedule.rate(Duration.minutes(1)), input: RuleTargetInput.fromText("Testing") }],
      monitoringConfiguration: noMonitoring,
      app: "testing",
    };
    new GuScheduledLambda(stack, "my-lambda-function", props);
    t.assert.snapshot(Template.fromStack(stack).toJSON());
  });
});
