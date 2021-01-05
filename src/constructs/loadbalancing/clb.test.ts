import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import { Vpc } from "@aws-cdk/aws-ec2";
import { Stack } from "@aws-cdk/core";
import { simpleGuStackForTesting } from "../../../test/utils/simple-gu-stack";
import type { SynthedStack } from "../../../test/utils/synthed-stack";
import { GuClassicLoadBalancer } from "../loadbalancing";

describe("The GuClassicLoadBalancer class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  test("overrides the id with the overrideId prop", () => {
    const stack = simpleGuStackForTesting();
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", { vpc, overrideId: true });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("ClassicLoadBalancer");
  });

  test("has an auto-generated ID by default", () => {
    const stack = simpleGuStackForTesting();
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", { vpc });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("ClassicLoadBalancer");
  });
});
