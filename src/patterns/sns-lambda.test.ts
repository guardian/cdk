import { Template } from "aws-cdk-lib/assertions";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import type { NoMonitoring } from "../constructs/cloudwatch";
import { GuTemplate, simpleTestingResources } from "../utils/test";
import { GuSnsLambda } from "./sns-lambda";

describe("The GuSnsLambda pattern", () => {
  it("should create the correct resources for a new stack with minimal config", () => {
    const { stack, app } = simpleTestingResources();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: noMonitoring,
      app: "testing",
    };
    new GuSnsLambda(app, "my-lambda-function", props);
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should inherit an existing SNS topic correctly", () => {
    const { stack, app } = simpleTestingResources();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: noMonitoring,
    };
    const { snsTopic } = new GuSnsLambda(app, "my-lambda-function", props);
    stack.overrideLogicalId(snsTopic, { logicalId: "in-use-sns-topic", reason: "testing" });
    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::SNS::Topic", "in-use-sns-topic");
  });

  it("should not generate a new SNS Topic if an externalTopicName is passed via existingSnsTopic", () => {
    const { stack, app } = simpleTestingResources();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: noMonitoring,
      existingSnsTopic: { externalTopicName: "sns-topic-from-another-stack" },
    };
    new GuSnsLambda(app, "my-lambda-function", props);

    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::SNS::Subscription", 1);
    template.resourceCountIs("AWS::SNS::Topic", 0);
  });

  it("should create an alarm if monitoring configuration is provided", () => {
    const { stack, app } = simpleTestingResources();
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: {
        toleratedErrorPercentage: 99,
        snsTopicName: "alerts-topic",
      },
    };
    new GuSnsLambda(app, "my-lambda-function", props);
    Template.fromStack(stack).resourceCountIs("AWS::CloudWatch::Alarm", 1);
  });
});
