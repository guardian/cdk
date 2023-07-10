import { Template } from "aws-cdk-lib/assertions";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import type { NoMonitoring } from "../../constructs/cloudwatch";
import { GuTemplate, simpleGuStackForTesting } from "../../utils/test";
import { GuSnsLambdaExperimental } from "./sns-lambda";

describe("The GuSnsLambda pattern", () => {
  it("should create the correct resources for a new stack with minimal config", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: noMonitoring,
      app: "testing",
    };
    new GuSnsLambdaExperimental(stack, "my-lambda-function", props);
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should inherit an existing SNS topic correctly", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: noMonitoring,
      app: "testing",
    };
    const { snsTopic } = new GuSnsLambdaExperimental(stack, "my-lambda-function", props);
    stack.overrideLogicalId(snsTopic, { logicalId: "in-use-sns-topic", reason: "testing" });
    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::SNS::Topic", "in-use-sns-topic");
  });

  it("should not generate a new SNS Topic if an externalTopicName is passed via existingSnsTopic", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: noMonitoring,
      existingSnsTopic: { externalTopicName: "sns-topic-from-another-stack" },
      app: "testing",
    };
    new GuSnsLambdaExperimental(stack, "my-lambda-function", props);

    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::SNS::Subscription", 1);
    template.resourceCountIs("AWS::SNS::Topic", 0);
  });

  it("should create an alarm if monitoring configuration is provided", () => {
    const stack = simpleGuStackForTesting();
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: {
        toleratedErrorPercentage: 99,
        snsTopicName: "alerts-topic",
      },
      app: "testing",
    };
    new GuSnsLambdaExperimental(stack, "my-lambda-function", props);
    Template.fromStack(stack).resourceCountIs("AWS::CloudWatch::Alarm", 1);
  });

  it("should send messages to $LATEST (i.e. an unpublished version) if the enableVersioning prop is unset", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: noMonitoring,
      app: "testing",
    };
    new GuSnsLambdaExperimental(stack, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::SNS::Subscription", {
      Endpoint: {
        "Fn::GetAtt": ["mylambdafunction8D341B54", "Arn"],
      },
    });
  });

  it("should send messages to an alias if the enableVersioning prop is set to true", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const props = {
      enableVersioning: true,
      fileName: "lambda.zip",
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: noMonitoring,
      app: "testing",
    };
    new GuSnsLambdaExperimental(stack, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::SNS::Subscription", {
      Endpoint: { Ref: "mylambdafunctionAliasForLambdaF2F98ED5" },
    });
  });
});
