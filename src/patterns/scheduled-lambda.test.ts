import { Duration } from "aws-cdk-lib";
import { Annotations, Match, Template } from "aws-cdk-lib/assertions";
import { Schedule } from "aws-cdk-lib/aws-events";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import type { NoMonitoring } from "../constructs/cloudwatch";
import { simpleGuStackForTesting } from "../utils/test";
import { GuScheduledLambda } from "./scheduled-lambda";

describe("The GuScheduledLambda pattern", () => {
  it("should meet AWS Foundational Security Best Practices", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_20_X,
      rules: [{ schedule: Schedule.rate(Duration.minutes(1)) }],
      monitoringConfiguration: noMonitoring,
      app: "testing",
    };
    new GuScheduledLambda(stack, "my-lambda-function", props);

    const warnings = Annotations.fromStack(stack).findWarning("*", Match.stringLikeRegexp("AwsSolutions-.*"));

    // try to provide helpful messages for debugging
    if (warnings.length > 0) {
      console.log(JSON.stringify(warnings, null, 2));
    }
    expect(warnings).toHaveLength(0);

    const errors = Annotations.fromStack(stack).findError("*", Match.stringLikeRegexp("AwsSolutions-.*"));

    // try to provide helpful messages for debugging
    if (errors.length > 0) {
      console.log(JSON.stringify(errors, null, 2));
    }
    expect(errors).toHaveLength(0);
  });

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
});
