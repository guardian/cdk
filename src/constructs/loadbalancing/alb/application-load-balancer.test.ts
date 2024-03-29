import { Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { GuTemplate, simpleGuStackForTesting } from "../../../utils/test";
import type { AppIdentity } from "../../core";
import {
  DROP_INVALID_HEADER_FIELDS_ENABLED,
  GuApplicationLoadBalancer,
  TLS_VERSION_AND_CIPHER_SUITE_HEADERS_ENABLED,
} from "./application-load-balancer";

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

    GuTemplate.fromStack(stack).hasResourceWithLogicalId(
      "AWS::ElasticLoadBalancingV2::LoadBalancer",
      /^ApplicationLoadBalancerTesting.+/,
    );
  });

  it("should apply the App tag", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });

    GuTemplate.fromStack(stack).hasGuTaggedResource("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      appIdentity: app,
    });
  });

  test("deletes the Type property if the removeType prop is set to true", () => {
    // not using an auto-generated logicalId to make the expectation notation easier
    const stack = simpleGuStackForTesting();
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", {
      ...app,
      vpc,
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
      LoadBalancerAttributes: Match.arrayWith([
        {
          Key: "deletion_protection.enabled",
          Value: "true",
        },
      ]),
    });
  });

  it("creates an cloudformation output of the dns name", () => {
    const stack = simpleGuStackForTesting();

    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });

    Template.fromStack(stack).hasOutput("ApplicationLoadBalancerTestingDnsName", {});
  });

  it("adds headers that include the TLS version and the cipher suite used during negotiation", () => {
    const stack = simpleGuStackForTesting();

    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      LoadBalancerAttributes: Match.arrayWith([
        {
          Key: TLS_VERSION_AND_CIPHER_SUITE_HEADERS_ENABLED,
          Value: "true",
        },
      ]),
    });
  });

  it("drops invalid headers before forwarding requests to the target", () => {
    const stack = simpleGuStackForTesting();

    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { ...app, vpc });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      LoadBalancerAttributes: Match.arrayWith([
        {
          Key: DROP_INVALID_HEADER_FIELDS_ENABLED,
          Value: "true",
        },
      ]),
    });
  });
});
