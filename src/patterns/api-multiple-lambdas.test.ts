import { Template } from "aws-cdk-lib/assertions";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { GuLambdaFunction } from "../constructs/lambda";
import { GuTemplate, simpleGuStackForTesting } from "../utils/test";
import { GuApiGatewayWithLambdaByPath } from "./api-multiple-lambdas";

describe("The GuApiGatewayWithLambdaByPath pattern", () => {
  it("should create the correct resources with minimal config", () => {
    const stack = simpleGuStackForTesting();
    const defaultProps = {
      handler: "handler.ts",
      runtime: Runtime.NODEJS_14_X,
      app: "testing",
    };
    const lambdaOne = new GuLambdaFunction(stack, "lambda-one", {
      ...defaultProps,
      fileName: "my-app-1.zip",
    });
    const lambdaTwo = new GuLambdaFunction(stack, "lambda-two", {
      ...defaultProps,
      fileName: "my-app-2.zip",
    });
    const lambdaThree = new GuLambdaFunction(stack, "lambda-three", {
      ...defaultProps,
      fileName: "my-app-3.zip",
    });
    new GuApiGatewayWithLambdaByPath(stack, {
      app: "testing",
      monitoringConfiguration: { noMonitoring: true },
      targets: [
        {
          path: "/test",
          httpMethod: "GET",
          lambda: lambdaOne,
        },
        {
          path: "/test",
          httpMethod: "POST",
          lambda: lambdaTwo,
        },
        {
          path: "/test/a/long/path",
          httpMethod: "GET",
          lambda: lambdaThree,
        },
      ],
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should create an alarm if the relevant monitoring configuration is provided", () => {
    const stack = simpleGuStackForTesting();
    const lambdaOne = new GuLambdaFunction(stack, "lambda-one", {
      handler: "handler.ts",
      runtime: Runtime.NODEJS_14_X,
      app: "testing",
      fileName: "my-app-1.zip",
    });
    new GuApiGatewayWithLambdaByPath(stack, {
      app: "testing",
      monitoringConfiguration: {
        snsTopicName: "my-alarm-topic",
        http5xxAlarm: {
          tolerated5xxPercentage: 1,
          numberOfMinutesAboveThresholdBeforeAlarm: 3,
        },
      },
      targets: [
        {
          path: "/test",
          httpMethod: "GET",
          lambda: lambdaOne,
        },
      ],
    });
    //The shape of this alarm is tested at construct level
    GuTemplate.fromStack(stack).hasResourceWithLogicalId(
      "AWS::CloudWatch::Alarm",
      /^ApiGatewayHigh5xxPercentageAlarm.+/
    );
  });
});
