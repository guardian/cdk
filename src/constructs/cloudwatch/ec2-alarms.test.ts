import { Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { ApplicationListener, ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { simpleTestingResources } from "../../utils/test";
import { GuApplicationLoadBalancer, GuApplicationTargetGroup } from "../loadbalancing";
import { GuAlb5xxPercentageAlarm, GuUnhealthyInstancesAlarm } from "./ec2-alarms";

const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
  vpcId: "test",
  availabilityZones: [""],
  publicSubnetIds: [""],
});

describe("The GuAlb5xxPercentageAlarm construct", () => {
  it("should create the correct alarm resource with minimal config", () => {
    const { stack, app } = simpleTestingResources();
    const alb = new GuApplicationLoadBalancer(app, "ApplicationLoadBalancer", { vpc });
    const props = {
      tolerated5xxPercentage: 1,
      snsTopicName: "test-topic",
    };
    new GuAlb5xxPercentageAlarm(app, { loadBalancer: alb, ...props });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should use a custom description if one is provided", () => {
    const { stack, app } = simpleTestingResources();
    const alb = new GuApplicationLoadBalancer(app, "ApplicationLoadBalancer", { vpc });
    const props = {
      alarmDescription: "test-custom-alarm-description",
      tolerated5xxPercentage: 1,
      snsTopicName: "test-topic",
    };
    new GuAlb5xxPercentageAlarm(app, { loadBalancer: alb, ...props });
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmDescription: "test-custom-alarm-description",
    });
  });

  it("should use a custom alarm name if one is provided", () => {
    const { stack, app } = simpleTestingResources();
    const alb = new GuApplicationLoadBalancer(app, "ApplicationLoadBalancer", { vpc });
    const props = {
      alarmName: "test-custom-alarm-name",
      tolerated5xxPercentage: 1,
      snsTopicName: "test-topic",
    };
    new GuAlb5xxPercentageAlarm(app, { loadBalancer: alb, ...props });
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "test-custom-alarm-name",
    });
  });

  it("should adjust the number of evaluation periods if a custom value is provided", () => {
    const { stack, app } = simpleTestingResources();
    const alb = new GuApplicationLoadBalancer(app, "ApplicationLoadBalancer", { vpc });
    const props = {
      tolerated5xxPercentage: 1,
      numberOfMinutesAboveThresholdBeforeAlarm: 3,
      snsTopicName: "test-topic",
    };
    new GuAlb5xxPercentageAlarm(app, { loadBalancer: alb, ...props });
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      EvaluationPeriods: 3,
    });
  });
});

describe("The GuUnhealthyInstancesAlarm construct", () => {
  it("should create the correct alarm resource with minimal config", () => {
    const { stack, app } = simpleTestingResources();
    const alb = new GuApplicationLoadBalancer(app, "ApplicationLoadBalancer", { vpc });
    const targetGroup = new GuApplicationTargetGroup(app, "ApplicationTargetGroup", { vpc });
    new ApplicationListener(stack, "ApplicationListener", {
      protocol: ApplicationProtocol.HTTP,

      loadBalancer: alb,
      defaultTargetGroups: [targetGroup],
    });
    new GuUnhealthyInstancesAlarm(app, { targetGroup: targetGroup, snsTopicName: "test-topic" });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
