import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Vpc } from "@aws-cdk/aws-ec2";
import { Stack } from "@aws-cdk/core";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuApplicationLoadBalancer } from "../loadbalancing";
import { Gu5xxPercentageAlarm } from "./ec2-alarms";
import type { AppIdentity } from "../core/identity";

const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
  vpcId: "test",
  availabilityZones: [""],
  publicSubnetIds: [""],
});

const app: AppIdentity = {
  app: "testing",
};

describe("The Gu5xxPercentageAlarm construct", () => {
  it("should create the correct alarm resource with minimal config", () => {
    const stack = simpleGuStackForTesting();
    const alb = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });
    const props = {
      tolerated5xxPercentage: 1,
      snsTopicName: "test-topic",
    };
    new Gu5xxPercentageAlarm(stack, "test", { ...app, loadBalancer: alb, ...props });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should use a custom description if one is provided", () => {
    const stack = simpleGuStackForTesting();
    const alb = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });
    const props = {
      alarmDescription: "test-custom-alarm-description",
      tolerated5xxPercentage: 1,
      snsTopicName: "test-topic",
    };
    new Gu5xxPercentageAlarm(stack, "test", { ...app, loadBalancer: alb, ...props });
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm", {
      AlarmDescription: "test-custom-alarm-description",
    });
  });

  it("should use a custom alarm name if one is provided", () => {
    const stack = simpleGuStackForTesting();
    const alb = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });
    const props = {
      alarmName: "test-custom-alarm-name",
      tolerated5xxPercentage: 1,
      snsTopicName: "test-topic",
    };
    new Gu5xxPercentageAlarm(stack, "test", { ...app, loadBalancer: alb, ...props });
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm", {
      AlarmName: "test-custom-alarm-name",
    });
  });

  it("should adjust the number of evaluation periods if a custom value is provided", () => {
    const stack = simpleGuStackForTesting();
    const alb = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });
    const props = {
      tolerated5xxPercentage: 1,
      numberOfMinutesAboveThresholdBeforeAlarm: 3,
      snsTopicName: "test-topic",
    };
    new Gu5xxPercentageAlarm(stack, "test", { ...app, loadBalancer: alb, ...props });
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm", {
      EvaluationPeriods: 3,
    });
  });
});
