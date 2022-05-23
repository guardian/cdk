import { Duration, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { GuTemplate, simpleGuStackForTesting } from "../../../utils/test";
import type { AppIdentity } from "../../core";
import { GuApplicationTargetGroup } from "./application-target-group";

const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
  vpcId: "test",
  availabilityZones: [""],
  publicSubnetIds: [""],
});

const app: AppIdentity = {
  app: "testing",
};

describe("The GuApplicationTargetGroup class", () => {
  it("should use the AppIdentity to form its auto-generated logicalId", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", { ...app, vpc });

    GuTemplate.fromStack(stack).hasResourceWithLogicalId(
      "AWS::ElasticLoadBalancingV2::TargetGroup",
      /^ApplicationTargetGroupTesting.+/
    );
  });

  it("should apply the App tag", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", { ...app, vpc });

    GuTemplate.fromStack(stack).hasGuTaggedResource("AWS::ElasticLoadBalancingV2::TargetGroup", {
      appIdentity: app,
    });
  });

  test("uses default health check properties", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", {
      ...app,
      vpc,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      HealthCheckIntervalSeconds: 10,
      HealthCheckPath: "/healthcheck",
      HealthCheckProtocol: "HTTP",
      HealthCheckTimeoutSeconds: 5,
      HealthyThresholdCount: 5,
      UnhealthyThresholdCount: 2,
    });
  });

  test("merges any health check properties provided", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", {
      ...app,
      vpc,
      healthCheck: {
        path: "/test",
        port: "9000",
      },
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      HealthCheckIntervalSeconds: 10,
      HealthCheckPath: "/test",
      HealthCheckPort: "9000",
      HealthCheckProtocol: "HTTP",
      HealthCheckTimeoutSeconds: 5,
      HealthyThresholdCount: 5,
      UnhealthyThresholdCount: 2,
    });
  });

  test("uses HTTP protocol by default", () => {
    const stack = simpleGuStackForTesting();

    new GuApplicationTargetGroup(stack, "TargetGroup", { vpc, ...app });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      Protocol: "HTTP",
    });
  });

  test("Can override default protocol with prop", () => {
    const stack = simpleGuStackForTesting();

    new GuApplicationTargetGroup(stack, "TargetGroup", {
      vpc,
      ...app,
      protocol: ApplicationProtocol.HTTPS,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      Protocol: "HTTPS",
    });
  });

  test("An illegal healthcheck is flagged", () => {
    const stack = simpleGuStackForTesting();

    expect(() => {
      new GuApplicationTargetGroup(stack, "TargetGroup", {
        ...app,
        vpc,
        healthCheck: {
          interval: Duration.seconds(10),
          timeout: Duration.seconds(10),
        },
      });
    }).toThrow(new Error("Illegal healthcheck configuration: timeout (10) must be lower than interval (10)"));
  });
});
