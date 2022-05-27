import { Template } from "aws-cdk-lib/assertions";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { GuLambdaFunction } from "../constructs/lambda";
import { GuTemplate, simpleTestingResources } from "../utils/test";
import { GuApiGatewayWithLambdaByPath } from "./api-multiple-lambdas";

describe("The GuApiGatewayWithLambdaByPath pattern", () => {
  it("should create the correct resources with minimal config", () => {
    const { stack, app } = simpleTestingResources();
    const defaultProps = {
      handler: "handler.ts",
      runtime: Runtime.NODEJS_14_X,
    };
    const lambdaOne = new GuLambdaFunction(app, "lambda-one", {
      ...defaultProps,
      fileName: "my-app-1.zip",
    });
    const lambdaTwo = new GuLambdaFunction(app, "lambda-two", {
      ...defaultProps,
      fileName: "my-app-2.zip",
    });
    const lambdaThree = new GuLambdaFunction(app, "lambda-three", {
      ...defaultProps,
      fileName: "my-app-3.zip",
    });
    new GuApiGatewayWithLambdaByPath(app, {
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
    const { stack, app } = simpleTestingResources();
    const lambdaOne = new GuLambdaFunction(app, "lambda-one", {
      handler: "handler.ts",
      runtime: Runtime.NODEJS_14_X,
      fileName: "my-app-1.zip",
    });
    new GuApiGatewayWithLambdaByPath(app, {
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
