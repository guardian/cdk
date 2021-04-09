import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Vpc } from "@aws-cdk/aws-ec2";
import { ApplicationProtocol, ListenerAction } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Stack } from "@aws-cdk/core";
import { RegexPattern } from "../../../constants";
import type { SynthedStack } from "../../../utils/test";
import { simpleGuStackForTesting } from "../../../utils/test";
import type { AppIdentity } from "../../core/identity";
import { GuApplicationListener, GuHttpsApplicationListener } from "./application-listener";
import { GuApplicationLoadBalancer } from "./application-load-balancer";
import { GuApplicationTargetGroup } from "./application-target-group";

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

  const app: AppIdentity = { app: "testing" };

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
      ...app,
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
      ...app,
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.TLSCertificateTesting).toEqual({
      Type: "String",
      AllowedPattern: RegexPattern.ACM_ARN,
      ConstraintDescription: "Must be an ACM ARN resource",
      Description: "The ARN of an ACM certificate for use on a load balancer",
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::Listener", {
      Certificates: [
        {
          CertificateArn: {
            Ref: "TLSCertificateTesting",
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
          ...app,
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
      ...app,
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
