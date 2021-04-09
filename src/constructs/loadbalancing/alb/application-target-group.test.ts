import "@aws-cdk/assert/jest";
import "../../../utils/test/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Vpc } from "@aws-cdk/aws-ec2";
import { ApplicationProtocol } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Stack } from "@aws-cdk/core";
import { TrackingTag } from "../../../constants/library-info";
import type { SynthedStack } from "../../../utils/test";
import { alphabeticalTags, simpleGuStackForTesting } from "../../../utils/test";
import type { AppIdentity } from "../../core/identity";
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

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::TargetGroup", {
      Tags: alphabeticalTags([
        { Key: "App", Value: app.app },
        {
          Key: "Stack",
          Value: stack.stack,
        },
        {
          Key: "Stage",
          Value: {
            Ref: "Stage",
          },
        },
        TrackingTag,
      ]),
    });
  });

  test("overrides the id if the prop is true", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", { ...app, vpc, overrideId: true });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("ApplicationTargetGroup");
  });

  test("does not override the id if the prop is false", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", { ...app, vpc });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("ApplicationTargetGroup");
  });

  test("overrides the id if the stack migrated value is true", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", { ...app, vpc });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("ApplicationTargetGroup");
  });

  test("does not override the id if the stack migrated value is true but the override id value is false", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", { ...app, vpc, overrideId: false });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("ApplicationTargetGroup");
  });

  test("uses default health check properties", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", {
      ...app,
      vpc,
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::TargetGroup", {
      HealthCheckIntervalSeconds: 30,
      HealthCheckPath: "/healthcheck",
      HealthCheckProtocol: "HTTP",
      HealthCheckTimeoutSeconds: 10,
      HealthyThresholdCount: 2,
      UnhealthyThresholdCount: 5,
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
      HealthCheckIntervalSeconds: 30,
      HealthCheckPath: "/test",
      HealthCheckPort: "9000",
      HealthCheckProtocol: "HTTP",
      HealthCheckTimeoutSeconds: 10,
      HealthyThresholdCount: 2,
      UnhealthyThresholdCount: 5,
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
});
