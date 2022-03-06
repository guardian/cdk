import { Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { GuTemplate, simpleGuStackForTesting } from "../../../utils/test";
import type { AppIdentity } from "../../core";
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

    new GuTemplate(stack).hasResourceWithLogicalId(
      "AWS::ElasticLoadBalancingV2::LoadBalancer",
      /^ApplicationLoadBalancerTesting.+/
    );
  });

  it("should apply the App tag", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });

    new GuTemplate(stack).hasGuTaggedResource("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      appIdentity: app,
    });
  });

  test("overrides the logicalId when existingLogicalId is set in a migrating stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", {
      ...app,
      vpc,
      existingLogicalId: { logicalId: "MyALB", reason: "testing" },
    });

    new GuTemplate(stack).hasResourceWithLogicalId("AWS::ElasticLoadBalancingV2::LoadBalancer", "MyALB");
  });

  test("auto-generates the logicalId by default", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });

    new GuTemplate(stack).hasResourceWithLogicalId(
      "AWS::ElasticLoadBalancingV2::LoadBalancer",
      /^ApplicationLoadBalancer.+$/
    );
  });

  test("deletes the Type property if the removeType prop is set to true", () => {
    // not using an auto-generated logicalId to make the expectation notation easier
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", {
      ...app,
      vpc,
      existingLogicalId: { logicalId: "MyALB", reason: "testing" },
      removeType: true,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      Type: Match.absent(),
    });
  });

  test("sets the deletion protection value to true by default", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
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

    Template.fromStack(stack).hasOutput("ApplicationLoadBalancerTestingDnsName", {});
  });
});
