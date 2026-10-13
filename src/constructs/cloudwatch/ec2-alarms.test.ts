import { suite, test } from "node:test";
import { Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { ApplicationListener, ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { simpleGuStackForTesting } from "../../utils/test";
import type { AppIdentity } from "../core";
import { GuApplicationLoadBalancer, GuApplicationTargetGroup } from "../loadbalancing";
import { GuAlb4xxPercentageAlarm, GuAlb5xxPercentageAlarm, GuUnhealthyInstancesAlarm } from "./ec2-alarms";

const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
  vpcId: "test",
  availabilityZones: [""],
  publicSubnetIds: [""],
});

const app: AppIdentity = {
  app: "testing",
};

suite("The GuAlb5xxPercentageAlarm construct", () => {
  test("should create the correct alarm resource with minimal config", (t) => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const alb = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", {
      ...app,
      vpc,
    });
    const props = {
      tolerated5xxPercentage: 1,
      snsTopicName: "test-topic",
    };
    new GuAlb5xxPercentageAlarm(stack, { ...app, loadBalancer: alb, ...props });
    t.assert.snapshot(Template.fromStack(stack).toJSON());
  });

  test("should use a custom description if one is provided", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const alb = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", {
      ...app,
      vpc,
    });
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

  test("should use a custom alarm name if one is provided", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const alb = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", {
      ...app,
      vpc,
    });
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

  test("should adjust the number of evaluation periods if a custom value is provided", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const alb = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", {
      ...app,
      vpc,
    });
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

suite("The GuAlb4xxPercentageAlarm construct", () => {
  test("should create the correct alarm resource with minimal config", (t) => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const alb = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", {
      ...app,
      vpc,
    });
    const props = {
      tolerated4xxPercentage: 1,
      snsTopicName: "test-topic",
    };
    new GuAlb4xxPercentageAlarm(stack, { ...app, loadBalancer: alb, ...props });
    t.assert.snapshot(Template.fromStack(stack).toJSON());
  });

  test("should use a custom description if one is provided", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const alb = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", {
      ...app,
      vpc,
    });
    const props = {
      alarmDescription: "test-custom-alarm-description",
      tolerated4xxPercentage: 1,
      snsTopicName: "test-topic",
    };
    new GuAlb4xxPercentageAlarm(stack, { ...app, loadBalancer: alb, ...props });
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmDescription: "test-custom-alarm-description",
    });
  });

  test("should use a custom alarm name if one is provided", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const alb = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", {
      ...app,
      vpc,
    });
    const props = {
      alarmName: "test-custom-alarm-name",
      tolerated4xxPercentage: 1,
      snsTopicName: "test-topic",
    };
    new GuAlb4xxPercentageAlarm(stack, { ...app, loadBalancer: alb, ...props });
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "test-custom-alarm-name",
    });
  });

  test("should adjust the number of evaluation periods if a custom value is provided", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const alb = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", {
      ...app,
      vpc,
    });
    const props = {
      tolerated4xxPercentage: 1,
      numberOfMinutesAboveThresholdBeforeAlarm: 3,
      snsTopicName: "test-topic",
    };
    new GuAlb4xxPercentageAlarm(stack, { ...app, loadBalancer: alb, ...props });
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      EvaluationPeriods: 3,
    });
  });
});

suite("The GuUnhealthyInstancesAlarm construct", () => {
  test("should create the correct alarm resource with minimal config", (t) => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const alb = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", {
      ...app,
      vpc,
    });
    const targetGroup = new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", { ...app, vpc });
    new ApplicationListener(stack, "ApplicationListener", {
      protocol: ApplicationProtocol.HTTP,
      ...app,
      loadBalancer: alb,
      defaultTargetGroups: [targetGroup],
    });
    new GuUnhealthyInstancesAlarm(stack, { ...app, targetGroup: targetGroup, snsTopicName: "test-topic" });
    t.assert.snapshot(Template.fromStack(stack).toJSON());
  });
});
