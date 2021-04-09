import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Vpc } from "@aws-cdk/aws-ec2";
import { Stack } from "@aws-cdk/core";
import type { SynthedStack } from "../../../utils/test";
import { simpleGuStackForTesting } from "../../../utils/test";
import { GuApplicationLoadBalancer } from "./application-load-balancer";

describe("The GuApplicationLoadBalancer class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  test("overrides the id with the overrideId prop", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc, overrideId: true });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("ApplicationLoadBalancer");
  });

  test("has an auto-generated ID by default", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("ApplicationLoadBalancer");
  });

  test("overrides the id if the stack migrated value is true", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("ApplicationLoadBalancer");
  });

  test("does not override the id if the stack migrated value is true but the override id value is false", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc, overrideId: false });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("ApplicationLoadBalancer");
  });

  test("deletes the Type property", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc, overrideId: true });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources.ApplicationLoadBalancer.Properties)).not.toContain("Type");
  });

  test("sets the deletion protection value to true by default", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      LoadBalancerAttributes: [
        {
          Key: "deletion_protection.enabled",
          Value: "true",
        },
      ],
    });
  });
});
