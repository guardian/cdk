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
    privateSubnetIds: [""],
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

  test("overrides the id if the stack migrated value is true", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", { vpc });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("ClassicLoadBalancer");
  });

  test("does not override the id if the stack migrated value is true but the override id value is false", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", { vpc, overrideId: false });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("ClassicLoadBalancer");
  });

  test("deletes any provided properties", () => {
    const stack = simpleGuStackForTesting();
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", {
      vpc,
      overrideId: true,
      propertiesToRemove: [GuClassicLoadBalancer.RemoveableProperties.SCHEME],
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources.ClassicLoadBalancer.Properties)).not.toContain("Scheme");
  });

  test("overrides any properties as required", () => {
    const stack = simpleGuStackForTesting();
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", {
      vpc,
      overrideId: true,
      propertiesToOverride: {
        AccessLoggingPolicy: {
          EmitInterval: 5,
          Enabled: true,
        },
      },
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancing::LoadBalancer", {
      AccessLoggingPolicy: {
        EmitInterval: 5,
        Enabled: true,
      },
    });
  });

  test("uses default health check properties", () => {
    const stack = simpleGuStackForTesting();
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", {
      vpc,
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancing::LoadBalancer", {
      HealthCheck: {
        HealthyThreshold: "2",
        Interval: "30",
        Target: "HTTP:9000/healthcheck",
        Timeout: "10",
        UnhealthyThreshold: "5",
      },
    });
  });

  test("merges any health check properties provided", () => {
    const stack = simpleGuStackForTesting();
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", {
      vpc,
      healthCheck: {
        path: "/test",
      },
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancing::LoadBalancer", {
      HealthCheck: {
        HealthyThreshold: "2",
        Interval: "30",
        Target: "HTTP:9000/test",
        Timeout: "10",
        UnhealthyThreshold: "5",
      },
    });
  });
});
