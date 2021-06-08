import "@aws-cdk/assert/jest";
import "../../../utils/test/jest";
import { Vpc } from "@aws-cdk/aws-ec2";
import { ApplicationProtocol, ListenerAction } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Stack } from "@aws-cdk/core";
import { Stage } from "../../../constants";
import { simpleGuStackForTesting } from "../../../utils/test";
import { GuCertificate } from "../../acm";
import { GuApplicationListener, GuHttpsApplicationListener } from "./application-listener";
import { GuApplicationLoadBalancer } from "./application-load-balancer";
import { GuApplicationTargetGroup } from "./application-target-group";
import type { GuStack } from "../../core";
import type { AppIdentity } from "../../core/identity";

const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
  vpcId: "test",
  availabilityZones: [""],
  publicSubnetIds: [""],
});

const app: AppIdentity = { app: "testing" };

const getLoadBalancer = (stack: GuStack): GuApplicationLoadBalancer => {
  return new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc, ...app });
};

const getCertificate = (stack: GuStack): GuCertificate => {
  return new GuCertificate(stack, {
    ...app,
    [Stage.CODE]: {
      domainName: "code-guardian.com",
    },
    [Stage.PROD]: {
      domainName: "prod-guardian.com",
    },
  });
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

  test("overrides the logicalId when existingLogicalId is set in a migrating stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });

    new GuApplicationListener(stack, "ApplicationListener", {
      ...app,
      loadBalancer: getLoadBalancer(stack),
      existingLogicalId: { logicalId: "AppListener", reason: "testing" },
      defaultAction: ListenerAction.forward([getAppTargetGroup(stack)]),
      certificates: [{ certificateArn: "" }],
    });

    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::ElasticLoadBalancingV2::Listener", "AppListener");
  });

  test("auto-generates the logicalId by default", () => {
    const stack = simpleGuStackForTesting();

    new GuApplicationListener(stack, "ApplicationListener", {
      ...app,
      loadBalancer: getLoadBalancer(stack),
      defaultAction: ListenerAction.forward([getAppTargetGroup(stack)]),
      certificates: [{ certificateArn: "" }],
    });

    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::ElasticLoadBalancingV2::Listener", /^ApplicationListener.+$/);
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
      certificate: getCertificate(stack),
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
      certificate: getCertificate(stack),
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

  test("wires up the certificate which is passed in correctly", () => {
    const stack = simpleGuStackForTesting();

    new GuHttpsApplicationListener(stack, "ApplicationListener", {
      certificate: getCertificate(stack),
      loadBalancer: getLoadBalancer(stack),
      targetGroup: getAppTargetGroup(stack),
      ...app,
    });
    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::Listener", {
      Certificates: [
        {
          CertificateArn: {
            Ref: "CertificateTesting28FCAC6D",
          },
        },
      ],
    });
  });
});
