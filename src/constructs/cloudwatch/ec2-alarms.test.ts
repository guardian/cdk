import { Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { ApplicationListener, ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { simpleGuStackForTesting } from "../../utils/test";
import type { AppIdentity } from "../core";
import { GuApplicationLoadBalancer, GuApplicationTargetGroup } from "../loadbalancing";
import { GuAlb5xxPercentageAlarm, GuUnhealthyInstancesAlarm } from "./ec2-alarms";

const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
  vpcId: "test",
  availabilityZones: [""],
  publicSubnetIds: [""],
});

const app: AppIdentity = {
  app: "testing",
};

describe("The GuAlb5xxPercentageAlarm construct", () => {
  it("should create the correct alarm resource with minimal config", () => {
    const stack = simpleGuStackForTesting();
    const alb = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });
    const props = {
      tolerated5xxPercentage: 1,
      snsTopicName: "test-topic",
    };
    new GuAlb5xxPercentageAlarm(stack, { ...app, loadBalancer: alb, ...props });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should use a custom description if one is provided", () => {
    const stack = simpleGuStackForTesting();
    const alb = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });
    const props = {
      alarmDescription: "test-custom-alarm-description",
      tolerated5xxPercentage: 1,
      snsTopicName: "test-topic",
    };
    new GuAlb5xxPercentageAlarm(stack, { ...app, loadBalancer: alb, ...props });
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
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
    new GuAlb5xxPercentageAlarm(stack, { ...app, loadBalancer: alb, ...props });
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
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
    new GuAlb5xxPercentageAlarm(stack, { ...app, loadBalancer: alb, ...props });
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      EvaluationPeriods: 3,
    });
  });
});

describe("The GuUnhealthyInstancesAlarm construct", () => {
  it("should create the correct alarm resource with minimal config", () => {
    const stack = simpleGuStackForTesting();
    const alb = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });
    const targetGroup = new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", { ...app, vpc });
    new ApplicationListener(stack, "ApplicationListener", {
      protocol: ApplicationProtocol.HTTP,
      ...app,
      loadBalancer: alb,
      defaultTargetGroups: [targetGroup],
    });
    new GuUnhealthyInstancesAlarm(stack, { ...app, targetGroup: targetGroup, snsTopicName: "test-topic" });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
