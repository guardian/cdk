import "@aws-cdk/assert/jest";
import "../../../utils/test/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Vpc } from "@aws-cdk/aws-ec2";
import { ApplicationProtocol, ListenerAction } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Stack } from "@aws-cdk/core";
import { RegexPattern } from "../../../constants";
import type { SynthedStack } from "../../../utils/test";
import { simpleGuStackForTesting } from "../../../utils/test";
import type { GuStack } from "../../core";
import type { AppIdentity } from "../../core/identity";
import { GuApplicationListener, GuHttpsApplicationListener } from "./application-listener";
import { GuApplicationLoadBalancer } from "./application-load-balancer";
import { GuApplicationTargetGroup } from "./application-target-group";

const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
  vpcId: "test",
  availabilityZones: [""],
  publicSubnetIds: [""],
});

const app: AppIdentity = { app: "testing" };

const getLoadBalancer = (stack: GuStack): GuApplicationLoadBalancer => {
  return new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc, ...app });
};

const getAppTargetGroup = (stack: GuStack): GuApplicationTargetGroup => {
  return new GuApplicationTargetGroup(stack, "TargetGroup", {
    ...app,
    vpc,
    protocol: ApplicationProtocol.HTTP,
  });
};

describe("The GuApplicationListener class", () => {
  it("should use the AppIdentity to form its auto-generated logicalId", () => {
    const stack = simpleGuStackForTesting();

    new GuApplicationListener(stack, "ApplicationListener", {
      ...app,
      loadBalancer: getLoadBalancer(stack),
      defaultAction: ListenerAction.forward([getAppTargetGroup(stack)]),
      certificates: [{ certificateArn: "" }],
    });

    expect(stack).toHaveResourceOfTypeAndLogicalId(
      "AWS::ElasticLoadBalancingV2::Listener",
      /ApplicationListenerTesting.+/
    );
  });

  test("overrides the id if the prop is true", () => {
    const stack = simpleGuStackForTesting();

    new GuApplicationListener(stack, "ApplicationListener", {
      ...app,
      loadBalancer: getLoadBalancer(stack),
      overrideId: true,
      defaultAction: ListenerAction.forward([getAppTargetGroup(stack)]),
      certificates: [{ certificateArn: "" }],
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("ApplicationListener");
  });

  test("does not override the id if the prop is false", () => {
    const stack = simpleGuStackForTesting();

    new GuApplicationListener(stack, "ApplicationListener", {
      ...app,
      loadBalancer: getLoadBalancer(stack),
      defaultAction: ListenerAction.forward([getAppTargetGroup(stack)]),
      certificates: [{ certificateArn: "" }],
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("ApplicationListener");
  });

  test("overrides the id if the stack migrated value is true", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });

    new GuApplicationListener(stack, "ApplicationListener", {
      ...app,
      loadBalancer: getLoadBalancer(stack),
      defaultAction: ListenerAction.forward([getAppTargetGroup(stack)]),
      certificates: [{ certificateArn: "" }],
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("ApplicationListener");
  });

  test("does not override the id if the stack migrated value is true but the override id value is false", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });

    new GuApplicationListener(stack, "ApplicationListener", {
      ...app,
      loadBalancer: getLoadBalancer(stack),
      overrideId: false,
      defaultAction: ListenerAction.forward([getAppTargetGroup(stack)]),
      certificates: [{ certificateArn: "" }],
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("ApplicationListener");
  });

  test("sets default props", () => {
    const stack = simpleGuStackForTesting();

    new GuApplicationListener(stack, "ApplicationListener", {
      ...app,
      loadBalancer: getLoadBalancer(stack),
      defaultAction: ListenerAction.forward([getAppTargetGroup(stack)]),
      certificates: [{ certificateArn: "" }],
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::Listener", {
      Port: 443,
      Protocol: "HTTPS",
    });
  });

  test("merges default and passed in props", () => {
    const stack = simpleGuStackForTesting();

    new GuApplicationListener(stack, "ApplicationListener", {
      ...app,
      loadBalancer: getLoadBalancer(stack),
      defaultAction: ListenerAction.forward([getAppTargetGroup(stack)]),
      certificates: [{ certificateArn: "" }],
      port: 80,
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::Listener", {
      Port: 80,
      Protocol: "HTTPS",
    });
  });

  test("Can override default protocol with prop", () => {
    const stack = simpleGuStackForTesting();

    new GuApplicationListener(stack, "Listener", {
      loadBalancer: getLoadBalancer(stack),
      defaultTargetGroups: [getAppTargetGroup(stack)],
      ...app,
      protocol: ApplicationProtocol.HTTP,
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::Listener", {
      Protocol: "HTTP",
    });
  });
});

describe("The GuHttpsApplicationListener class", () => {
  it("should use the AppIdentity to form its auto-generated logicalId", () => {
    const stack = simpleGuStackForTesting();

    new GuHttpsApplicationListener(stack, "HttpsApplicationListener", {
      ...app,
      loadBalancer: getLoadBalancer(stack),
      targetGroup: getAppTargetGroup(stack),
    });

    expect(stack).toHaveResourceOfTypeAndLogicalId(
      "AWS::ElasticLoadBalancingV2::Listener",
      /^HttpsApplicationListenerTesting.+/
    );
  });

  test("sets default props", () => {
    const stack = simpleGuStackForTesting();

    new GuHttpsApplicationListener(stack, "ApplicationListener", {
      loadBalancer: getLoadBalancer(stack),
      targetGroup: getAppTargetGroup(stack),
      ...app,
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::Listener", {
      Port: 443,
      Protocol: "HTTPS",
      DefaultActions: [
        {
          TargetGroupArn: {
            Ref: "TargetGroupTesting29B71ABC",
          },
          Type: "forward",
        },
      ],
    });
  });

  test("creates certificate prop if no value passed in", () => {
    const stack = simpleGuStackForTesting();

    new GuHttpsApplicationListener(stack, "ApplicationListener", {
      loadBalancer: getLoadBalancer(stack),
      targetGroup: getAppTargetGroup(stack),
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

    expect(
      () =>
        new GuHttpsApplicationListener(stack, "ApplicationListener", {
          loadBalancer: getLoadBalancer(stack),
          targetGroup: getAppTargetGroup(stack),
          certificate: "test",
          ...app,
        })
    ).toThrowError(new Error("test is not a valid ACM ARN"));
  });

  test("does not create certificate prop if a value passed in", () => {
    const stack = simpleGuStackForTesting();

    new GuHttpsApplicationListener(stack, "ApplicationListener", {
      loadBalancer: getLoadBalancer(stack),
      targetGroup: getAppTargetGroup(stack),
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
