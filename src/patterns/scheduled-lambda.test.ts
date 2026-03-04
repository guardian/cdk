import { Duration } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { RuleTargetInput, Schedule } from "aws-cdk-lib/aws-events";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import type { NoMonitoring } from "../constructs/cloudwatch";
import { simpleGuStackForTesting } from "../utils/test";
import { GuScheduledLambda } from "./scheduled-lambda";

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
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
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
    Template.fromStack(stack).resourceCountIs("AWS::CloudWatch::Alarm", 1);
  });

  it("should invoke $LATEST (i.e. an unpublished version) if the enableVersioning prop is unset", () => {
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

  it("should invoke an alias if the enableVersioning prop is set to true", () => {
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

  it("should produce stable resource IDs when using a cron schedule", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_20_X,
      rules: [{ schedule: Schedule.expression("cron(* * * * ? *)") }],
      monitoringConfiguration: noMonitoring,
      app: "testing",
    };
    new GuScheduledLambda(stack, "my-lambda-function", props);
    const template = Template.fromStack(stack);
    const resources = template.toJSON().Resources as Record<string, { Type: string }>;
    const ruleIds = Object.keys(resources).filter((id) => {
      return resources[id]?.Type === "AWS::Events::Rule";
    });

    // Resource IDs must not contain characters from cron expressions such as ( ) * ?
    for (const id of ruleIds) {
      expect(id).not.toMatch(/[^a-zA-Z0-9]/);
    }

    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should create the correct resources with an input in the rule", () => {
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
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
