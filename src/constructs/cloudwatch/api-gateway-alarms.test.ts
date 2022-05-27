import { Template } from "aws-cdk-lib/assertions";
import { MockIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { simpleTestingResources } from "../../utils/test";
import type { GuApp } from "../core";
import { GuApiGateway5xxPercentageAlarm } from "./api-gateway-alarms";

function setupBasicRestApi(stack: GuApp): RestApi {
  const restApi = new RestApi(stack, "RestApi", {});
  restApi.root.addResource("test");
  restApi.root.addMethod("GET", new MockIntegration());
  return restApi;
}

describe("The GuApiGateway5xxPercentageAlarm construct", () => {
  it("should create the correct alarm resource with minimal config", () => {
    const { stack, app } = simpleTestingResources();
    const props = {
      tolerated5xxPercentage: 1,
      snsTopicName: "test-topic",
    };
    new GuApiGateway5xxPercentageAlarm(app, { apiGatewayInstance: setupBasicRestApi(app), ...props });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should use a custom description if one is provided", () => {
    const { stack, app } = simpleTestingResources();
    const props = {
      alarmDescription: "test-custom-alarm-description",
      tolerated5xxPercentage: 1,
      snsTopicName: "test-topic",
    };
    new GuApiGateway5xxPercentageAlarm(app, { apiGatewayInstance: setupBasicRestApi(app), ...props });
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmDescription: "test-custom-alarm-description",
    });
  });

  it("should use a custom alarm name if one is provided", () => {
    const { stack, app } = simpleTestingResources();
    const props = {
      alarmName: "test-custom-alarm-name",
      tolerated5xxPercentage: 1,
      snsTopicName: "test-topic",
    };
    new GuApiGateway5xxPercentageAlarm(app, { apiGatewayInstance: setupBasicRestApi(app), ...props });
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "test-custom-alarm-name",
    });
  });

  it("should adjust the number of evaluation periods if a custom value is provided", () => {
    const { stack, app } = simpleTestingResources();
    const props = {
      tolerated5xxPercentage: 1,
      numberOfMinutesAboveThresholdBeforeAlarm: 3,
      snsTopicName: "test-topic",
    };
    new GuApiGateway5xxPercentageAlarm(app, { apiGatewayInstance: setupBasicRestApi(app), ...props });
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      EvaluationPeriods: 3,
    });
  });
});
