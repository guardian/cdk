import { Duration } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Schedule } from "aws-cdk-lib/aws-events";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import type { NoMonitoring } from "../constructs/cloudwatch";
import { simpleTestingResources } from "../utils/test";
import { GuScheduledLambda } from "./scheduled-lambda";

describe("The GuScheduledLambda pattern", () => {
  it("should create the correct resources with minimal config", () => {
    const { stack, app } = simpleTestingResources();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      rules: [{ schedule: Schedule.rate(Duration.minutes(1)) }],
      monitoringConfiguration: noMonitoring,
    };
    new GuScheduledLambda(app, "my-lambda-function", props);
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should create an alarm if monitoring configuration is provided", () => {
    const { stack, app } = simpleTestingResources();
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
    };
    new GuScheduledLambda(app, "my-lambda-function", props);
    Template.fromStack(stack).resourceCountIs("AWS::CloudWatch::Alarm", 1);
  });
});
