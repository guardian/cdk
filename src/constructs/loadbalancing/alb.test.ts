import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import { Vpc } from "@aws-cdk/aws-ec2";
import { ApplicationProtocol, ListenerAction } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Stack } from "@aws-cdk/core";
import { simpleGuStackForTesting } from "../../../test/utils";
import type { SynthedStack } from "../../../test/utils";
import { RegexPattern } from "../../constants";
import {
  GuApplicationListener,
  GuApplicationLoadBalancer,
  GuApplicationTargetGroup,
  GuHttpsApplicationListener,
} from "./alb";

describe("The GuApplicationLoadBalancer class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  test("overrides the id with the overrideId prop", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc, overrideId: true });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("ApplicationLoadBalancer");
  });

  test("has an auto-generated ID by default", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("ApplicationLoadBalancer");
  });

  test("overrides the id if the stack migrated value is true", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("ApplicationLoadBalancer");
  });

  test("does not override the id if the stack migrated value is true but the override id value is false", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc, overrideId: false });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("ApplicationLoadBalancer");
  });

  test("deletes the Type property", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc, overrideId: true });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources.ApplicationLoadBalancer.Properties)).not.toContain("Type");
  });

  test("sets the deletion protection value to true by default", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      LoadBalancerAttributes: [
        {
          Key: "deletion_protection.enabled",
          Value: "true",
        },
      ],
    });
  });
});

describe("The GuApplicationTargetGroup class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  test("overrides the id if the prop is true", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", { vpc, overrideId: true });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("ApplicationTargetGroup");
  });

  test("does not override the id if the prop is false", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", { vpc });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("ApplicationTargetGroup");
  });

  test("overrides the id if the stack migrated value is true", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", { vpc });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("ApplicationTargetGroup");
  });

  test("does not override the id if the stack migrated value is true but the override id value is false", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", { vpc, overrideId: false });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("ApplicationTargetGroup");
  });

  test("uses default health check properties", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", {
      vpc,
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::TargetGroup", {
      HealthCheckIntervalSeconds: 30,
      HealthCheckPath: "/healthcheck",
      HealthCheckPort: "9000",
      HealthCheckProtocol: "HTTP",
      HealthCheckTimeoutSeconds: 10,
      HealthyThresholdCount: 2,
      UnhealthyThresholdCount: 5,
    });
  });

  test("merges any health check properties provided", () => {
    const stack = simpleGuStackForTesting();
    new GuApplicationTargetGroup(stack, "ApplicationTargetGroup", {
      vpc,
      healthCheck: {
        path: "/test",
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
});

describe("The GuApplicationListener class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  test("overrides the id if the prop is true", () => {
    const stack = simpleGuStackForTesting();

    const loadBalancer = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });
    const targetGroup = new GuApplicationTargetGroup(stack, "GrafanaInternalTargetGroup", {
      vpc: vpc,
      protocol: ApplicationProtocol.HTTP,
    });

    new GuApplicationListener(stack, "ApplicationListener", {
      loadBalancer,
      overrideId: true,
      defaultAction: ListenerAction.forward([targetGroup]),
      certificates: [{ certificateArn: "" }],
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("ApplicationListener");
  });

  test("does not override the id if the prop is false", () => {
    const stack = simpleGuStackForTesting();

    const loadBalancer = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });
    const targetGroup = new GuApplicationTargetGroup(stack, "GrafanaInternalTargetGroup", {
      vpc: vpc,
      protocol: ApplicationProtocol.HTTP,
    });

    new GuApplicationListener(stack, "ApplicationListener", {
      loadBalancer,
      defaultAction: ListenerAction.forward([targetGroup]),
      certificates: [{ certificateArn: "" }],
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("ApplicationListener");
  });

  test("overrides the id if the stack migrated value is true", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });

    const loadBalancer = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });
    const targetGroup = new GuApplicationTargetGroup(stack, "GrafanaInternalTargetGroup", {
      vpc: vpc,
      protocol: ApplicationProtocol.HTTP,
    });

    new GuApplicationListener(stack, "ApplicationListener", {
      loadBalancer,
      defaultAction: ListenerAction.forward([targetGroup]),
      certificates: [{ certificateArn: "" }],
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("ApplicationListener");
  });

  test("does not override the id if the stack migrated value is true but the override id value is false", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });

    const loadBalancer = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });
    const targetGroup = new GuApplicationTargetGroup(stack, "GrafanaInternalTargetGroup", {
      vpc: vpc,
      protocol: ApplicationProtocol.HTTP,
    });

    new GuApplicationListener(stack, "ApplicationListener", {
      loadBalancer,
      overrideId: false,
      defaultAction: ListenerAction.forward([targetGroup]),
      certificates: [{ certificateArn: "" }],
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("ApplicationListener");
  });

  test("sets default props", () => {
    const stack = simpleGuStackForTesting();

    const loadBalancer = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });
    const targetGroup = new GuApplicationTargetGroup(stack, "GrafanaInternalTargetGroup", {
      vpc: vpc,
      protocol: ApplicationProtocol.HTTP,
    });

    new GuApplicationListener(stack, "ApplicationListener", {
      loadBalancer,
      defaultAction: ListenerAction.forward([targetGroup]),
      certificates: [{ certificateArn: "" }],
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::Listener", {
      Port: 443,
      Protocol: "HTTPS",
    });
  });

  test("merges default and passed in props", () => {
    const stack = simpleGuStackForTesting();

    const loadBalancer = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });
    const targetGroup = new GuApplicationTargetGroup(stack, "GrafanaInternalTargetGroup", {
      vpc: vpc,
      protocol: ApplicationProtocol.HTTP,
    });

    new GuApplicationListener(stack, "ApplicationListener", {
      loadBalancer,
      defaultAction: ListenerAction.forward([targetGroup]),
      certificates: [{ certificateArn: "" }],
      port: 80,
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::Listener", {
      Port: 80,
      Protocol: "HTTPS",
    });
  });
});

describe("The GuHttpsApplicationListener class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  test("sets default props", () => {
    const stack = simpleGuStackForTesting();

    const loadBalancer = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });
    const targetGroup = new GuApplicationTargetGroup(stack, "GrafanaInternalTargetGroup", {
      vpc: vpc,
      protocol: ApplicationProtocol.HTTP,
    });

    new GuHttpsApplicationListener(stack, "ApplicationListener", {
      loadBalancer,
      targetGroup,
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::Listener", {
      Port: 443,
      Protocol: "HTTPS",
      DefaultActions: [
        {
          TargetGroupArn: {
            Ref: "GrafanaInternalTargetGroup837A1034",
          },
          Type: "forward",
        },
      ],
    });
  });

  test("creates certificate prop if no value passed in", () => {
    const stack = simpleGuStackForTesting();

    const loadBalancer = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });
    const targetGroup = new GuApplicationTargetGroup(stack, "GrafanaInternalTargetGroup", {
      vpc: vpc,
      protocol: ApplicationProtocol.HTTP,
    });

    new GuHttpsApplicationListener(stack, "ApplicationListener", {
      loadBalancer,
      targetGroup,
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.TLSCertificate).toEqual({
      Type: "String",
      AllowedPattern: RegexPattern.ACM_ARN,
      ConstraintDescription: "Must be an ACM ARN resource",
      Description: "Certificate ARN for ApplicationListener",
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::Listener", {
      Certificates: [
        {
          CertificateArn: {
            Ref: "TLSCertificate",
          },
        },
      ],
    });
  });

  test("passing in an invalid ACM ARN", () => {
    const stack = simpleGuStackForTesting();

    const loadBalancer = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });
    const targetGroup = new GuApplicationTargetGroup(stack, "GrafanaInternalTargetGroup", {
      vpc: vpc,
      protocol: ApplicationProtocol.HTTP,
    });

    expect(
      () =>
        new GuHttpsApplicationListener(stack, "ApplicationListener", {
          loadBalancer,
          targetGroup,
          certificate: "test",
        })
    ).toThrowError(new Error("test is not a valid ACM ARN"));
  });

  test("does not create certificate prop if a value passed in", () => {
    const stack = simpleGuStackForTesting();

    const loadBalancer = new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });
    const targetGroup = new GuApplicationTargetGroup(stack, "GrafanaInternalTargetGroup", {
      vpc: vpc,
      protocol: ApplicationProtocol.HTTP,
    });

    new GuHttpsApplicationListener(stack, "ApplicationListener", {
      loadBalancer,
      targetGroup,
      certificate: "arn:aws:acm:eu-west-1:000000000000:certificate/123abc-0000-0000-0000-123abc",
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(Object.keys(json.Parameters)).not.toContain("CertificateARN");

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::Listener", {
      Certificates: [
        {
          CertificateArn: "arn:aws:acm:eu-west-1:000000000000:certificate/123abc-0000-0000-0000-123abc",
        },
      ],
    });
  });
});
