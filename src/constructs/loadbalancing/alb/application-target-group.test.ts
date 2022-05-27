import { Duration, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { GuTemplate, simpleTestingResources } from "../../../utils/test";
import { GuApplicationTargetGroup } from "./application-target-group";

const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
  vpcId: "test",
  availabilityZones: [""],
  publicSubnetIds: [""],
});

describe("The GuApplicationTargetGroup class", () => {
  it("should use the AppIdentity to form its auto-generated logicalId", () => {
    const { stack, app } = simpleTestingResources();
    new GuApplicationTargetGroup(app, "ApplicationTargetGroup", { vpc });

    GuTemplate.fromStack(stack).hasResourceWithLogicalId(
      "AWS::ElasticLoadBalancingV2::TargetGroup",
      /^ApplicationTargetGroupTesting.+/
    );
  });

  it("should apply the App tag", () => {
    const { stack, app } = simpleTestingResources();
    new GuApplicationTargetGroup(app, "ApplicationTargetGroup", { vpc });

    GuTemplate.fromStack(stack).hasGuTaggedResource("AWS::ElasticLoadBalancingV2::TargetGroup", {
      app,
    });
  });

  test("uses default health check properties", () => {
    const { stack, app } = simpleTestingResources();
    new GuApplicationTargetGroup(app, "ApplicationTargetGroup", {
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
    const { stack, app } = simpleTestingResources();
    new GuApplicationTargetGroup(app, "ApplicationTargetGroup", {
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
    const { stack, app } = simpleTestingResources();

    new GuApplicationTargetGroup(app, "TargetGroup", { vpc });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      Protocol: "HTTP",
    });
  });

  test("Can override default protocol with prop", () => {
    const { stack, app } = simpleTestingResources();

    new GuApplicationTargetGroup(app, "TargetGroup", {
      vpc,
      protocol: ApplicationProtocol.HTTPS,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      Protocol: "HTTPS",
    });
  });

  test("An illegal healthcheck is flagged", () => {
    const { app } = simpleTestingResources();

    expect(() => {
      new GuApplicationTargetGroup(app, "TargetGroup", {
        vpc,
        healthCheck: {
          interval: Duration.seconds(10),
          timeout: Duration.seconds(10),
        },
      });
    }).toThrow(new Error("Illegal healthcheck configuration: timeout (10) must be lower than interval (10)"));
  });
});
