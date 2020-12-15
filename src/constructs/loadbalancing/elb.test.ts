import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import { Vpc } from "@aws-cdk/aws-ec2";
import { ApplicationProtocol, ListenerAction } from "@aws-cdk/aws-elasticloadbalancingv2";
import { App, Stack } from "@aws-cdk/core";
import type { SynthedStack } from "../../../test/utils/synthed-stack";
import { GuStack } from "../core/stack";
import { GuApplicationListener, GuApplicationLoadBalancer, GuApplicationTargetGroup } from "../loadbalancing";

describe("The GuApplicationLoadBalancer class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  test("overrides the id", () => {
    const app = new App();
    const stack = new GuStack(app);
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("ApplicationLoadBalancer");
  });

  test("deletes the Type property", () => {
    const app = new App();
    const stack = new GuStack(app);
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources.ApplicationLoadBalancer.Properties)).not.toContain("Type");
  });
});

describe("The GuApplicationTargetGroup class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  test("overrides the id if the prop is true", () => {
    const app = new App();
    const stack = new GuStack(app);
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", { vpc, overrideId: true });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("ApplicationTargetGroup");
  });

  test("does not override the id if the prop is false", () => {
    const app = new App();
    const stack = new GuStack(app);
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", { vpc });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("ApplicationTargetGroup");
  });
});

describe("The GuApplicationListener class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  test("overrides the id if the prop is true", () => {
    const app = new App();
    const stack = new GuStack(app);

    const loadBalancer = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });
    const targetGroup = new GuApplicationTargetGroup(stack, "GrafanaInternalTargetGroup", {
      vpc: vpc,
      protocol: ApplicationProtocol.HTTP,
    });

    new GuApplicationListener(stack, "ApplicationListener", {
      loadBalancer,
      overrideId: true,
      defaultAction: ListenerAction.forward([targetGroup]),
      certificates: [{ certificateArn: "" }],
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("ApplicationListener");
  });

  test("does not override the id if the prop is false", () => {
    const app = new App();
    const stack = new GuStack(app);

    const loadBalancer = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });
    const targetGroup = new GuApplicationTargetGroup(stack, "GrafanaInternalTargetGroup", {
      vpc: vpc,
      protocol: ApplicationProtocol.HTTP,
    });

    new GuApplicationListener(stack, "ApplicationListener", {
      loadBalancer,
      defaultAction: ListenerAction.forward([targetGroup]),
      certificates: [{ certificateArn: "" }],
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("ApplicationListener");
  });

  test("sets default props", () => {
    const app = new App();
    const stack = new GuStack(app);

    const loadBalancer = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });
    const targetGroup = new GuApplicationTargetGroup(stack, "GrafanaInternalTargetGroup", {
      vpc: vpc,
      protocol: ApplicationProtocol.HTTP,
    });

    new GuApplicationListener(stack, "ApplicationListener", {
      loadBalancer,
      defaultAction: ListenerAction.forward([targetGroup]),
      certificates: [{ certificateArn: "" }],
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::Listener", {
      Port: 443,
      Protocol: "HTTPS",
    });
  });

  test("merges default and passed in props", () => {
    const app = new App();
    const stack = new GuStack(app);

    const loadBalancer = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });
    const targetGroup = new GuApplicationTargetGroup(stack, "GrafanaInternalTargetGroup", {
      vpc: vpc,
      protocol: ApplicationProtocol.HTTP,
    });

    new GuApplicationListener(stack, "ApplicationListener", {
      loadBalancer,
      defaultAction: ListenerAction.forward([targetGroup]),
      certificates: [{ certificateArn: "" }],
      port: 80,
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::Listener", {
      Port: 80,
      Protocol: "HTTPS",
    });
  });
});
