import { suite, test } from "node:test";
import { Template } from "aws-cdk-lib/assertions";
import { MockIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { simpleGuStackForTesting } from "../../utils/test";
import type { AppIdentity, GuStack } from "../core";
import { GuApiGateway5xxPercentageAlarm } from "./api-gateway-alarms";

const app: AppIdentity = {
  app: "testing",
};

function setupBasicRestApi(stack: GuStack): RestApi {
  const restApi = new RestApi(stack, "RestApi", {});
  restApi.root.addResource("test");
  restApi.root.addMethod("GET", new MockIntegration());
  return restApi;
}

suite("The GuApiGateway5xxPercentageAlarm construct", () => {
  test("should create the correct alarm resource with minimal config", (t) => {
    const stack = simpleGuStackForTesting();
    const props = {
      tolerated5xxPercentage: 1,
      snsTopicName: "test-topic",
    };
    new GuApiGateway5xxPercentageAlarm(stack, { ...app, apiGatewayInstance: setupBasicRestApi(stack), ...props });
    t.assert.snapshot(Template.fromStack(stack).toJSON());
  });

  test("should use a custom description if one is provided", () => {
    const stack = simpleGuStackForTesting();
    const props = {
      alarmDescription: "test-custom-alarm-description",
      tolerated5xxPercentage: 1,
      snsTopicName: "test-topic",
    };
    new GuApiGateway5xxPercentageAlarm(stack, { ...app, apiGatewayInstance: setupBasicRestApi(stack), ...props });
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmDescription: "test-custom-alarm-description",
    });
  });

  test("should use a custom alarm name if one is provided", () => {
    const stack = simpleGuStackForTesting();
    const props = {
      alarmName: "test-custom-alarm-name",
      tolerated5xxPercentage: 1,
      snsTopicName: "test-topic",
    };
    new GuApiGateway5xxPercentageAlarm(stack, { ...app, apiGatewayInstance: setupBasicRestApi(stack), ...props });
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "test-custom-alarm-name",
    });
  });

  test("should adjust the number of evaluation periods if a custom value is provided", () => {
    const stack = simpleGuStackForTesting();
    const props = {
      tolerated5xxPercentage: 1,
      numberOfMinutesAboveThresholdBeforeAlarm: 3,
      snsTopicName: "test-topic",
    };
    new GuApiGateway5xxPercentageAlarm(stack, { ...app, apiGatewayInstance: setupBasicRestApi(stack), ...props });
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      EvaluationPeriods: 3,
    });
  });
});
