import "@aws-cdk/assert/jest";
import "../../../utils/test/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Vpc } from "@aws-cdk/aws-ec2";
import { Stack } from "@aws-cdk/core";
import type { SynthedStack } from "../../../utils/test";
import { simpleGuStackForTesting } from "../../../utils/test";
import type { AppIdentity } from "../../core/identity";
import { GuApplicationLoadBalancer } from "./application-load-balancer";

const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
  vpcId: "test",
  availabilityZones: [""],
  publicSubnetIds: [""],
});

const app: AppIdentity = {
  app: "testing",
};

describe("The GuApplicationLoadBalancer class", () => {
  it("should use the AppIdentity to form its auto-generated logicalId", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });

    expect(stack).toHaveResourceOfTypeAndLogicalId(
      "AWS::ElasticLoadBalancingV2::LoadBalancer",
      /^ApplicationLoadBalancerTesting.+/
    );
  });

  it("should apply the App tag", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });

    expect(stack).toHaveGuTaggedResource("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      appIdentity: app,
    });
  });

  test("overrides the logicalId when existingLogicalId is set in a migrating stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc, existingLogicalId: "MyALB" });

    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::ElasticLoadBalancingV2::LoadBalancer", "MyALB");
  });

  test("auto-generates the logicalId by default", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });

    expect(stack).toHaveResourceOfTypeAndLogicalId(
      "AWS::ElasticLoadBalancingV2::LoadBalancer",
      /^ApplicationLoadBalancer.+$/
    );
  });

  test("deletes the Type property", () => {
    // not using an auto-generated logicalId to make the expectation notation easier
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc, existingLogicalId: "MyALB" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources.MyALB.Properties)).not.toContain("Type");
  });

  test("sets the deletion protection value to true by default", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      LoadBalancerAttributes: [
        {
          Key: "deletion_protection.enabled",
          Value: "true",
        },
      ],
    });
  });

  it("creates an cloudformation output of the dns name", () => {
    const stack = simpleGuStackForTesting();

    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });

    expect(stack).toHaveOutput({
      outputName: "ApplicationLoadBalancerTestingDnsName",
    });
  });
});
