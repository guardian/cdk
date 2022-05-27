import { Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { GuTemplate, simpleTestingResources } from "../../../utils/test";
import { GuApplicationLoadBalancer } from "./application-load-balancer";

const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
  vpcId: "test",
  availabilityZones: [""],
  publicSubnetIds: [""],
});

describe("The GuApplicationLoadBalancer class", () => {
  it("should use the AppIdentity to form its auto-generated logicalId", () => {
    const { stack, app } = simpleTestingResources();
    new GuApplicationLoadBalancer(app, "ApplicationLoadBalancer", { vpc });

    GuTemplate.fromStack(stack).hasResourceWithLogicalId(
      "AWS::ElasticLoadBalancingV2::LoadBalancer",
      /^ApplicationLoadBalancerTesting.+/
    );
  });

  it("should apply the App tag", () => {
    const { stack, app } = simpleTestingResources();
    new GuApplicationLoadBalancer(app, "ApplicationLoadBalancer", { vpc });

    GuTemplate.fromStack(stack).hasGuTaggedResource("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      app,
    });
  });

  test("deletes the Type property if the removeType prop is set to true", () => {
    const { stack, app } = simpleTestingResources();
    new GuApplicationLoadBalancer(app, "ApplicationLoadBalancer", {
      vpc,
      removeType: true,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      Type: Match.absent(),
    });
  });

  test("sets the deletion protection value to true by default", () => {
    const { stack, app } = simpleTestingResources();
    new GuApplicationLoadBalancer(app, "ApplicationLoadBalancer", { vpc });

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
    const { stack, app } = simpleTestingResources();

    new GuApplicationLoadBalancer(app, "ApplicationLoadBalancer", { vpc });

    Template.fromStack(stack).hasOutput("ApplicationLoadBalancerTestingDnsName", {});
  });
});
