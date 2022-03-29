import "@aws-cdk/assert/jest";
import "../../../utils/test/jest";
import { Duration, Stack } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { simpleGuStackForTesting } from "../../../utils/test";
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

    expect(stack).toHaveResourceOfTypeAndLogicalId(
      "AWS::ElasticLoadBalancingV2::TargetGroup",
      /^ApplicationTargetGroupTesting.+/
    );
  });

  it("should apply the App tag", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", { ...app, vpc });

    expect(stack).toHaveGuTaggedResource("AWS::ElasticLoadBalancingV2::TargetGroup", {
      appIdentity: app,
    });
  });

  test("overrides the logicalId when existingLogicalId is set in a migrating stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", {
      ...app,
      vpc,
      existingLogicalId: { logicalId: "MyTargetGroup", reason: "testing" },
    });

    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::ElasticLoadBalancingV2::TargetGroup", "MyTargetGroup");
  });

  test("auto-generates the logicalId by default", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", { ...app, vpc });

    expect(stack).toHaveResourceOfTypeAndLogicalId(
      "AWS::ElasticLoadBalancingV2::TargetGroup",
      /^ApplicationTargetGroup.+$/
    );
  });

  test("uses default health check properties", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", {
      ...app,
      vpc,
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::TargetGroup", {
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

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::TargetGroup", {
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

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::TargetGroup", {
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

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::TargetGroup", {
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
