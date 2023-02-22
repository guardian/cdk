import { Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { ApplicationProtocol, ListenerAction } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { GuTemplate, simpleGuStackForTesting } from "../../../utils/test";
import { GuCertificate } from "../../acm";
import type { AppIdentity, GuStack } from "../../core";
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

const getCertificate = (stack: GuStack): GuCertificate => {
  return new GuCertificate(stack, {
    ...app,
    domainName: "code-guardian.com",
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

    GuTemplate.fromStack(stack).hasResourceWithLogicalId(
      "AWS::ElasticLoadBalancingV2::Listener",
      /ApplicationListenerTesting.+/
    );
  });

  test("sets default props", () => {
    const stack = simpleGuStackForTesting();

    new GuApplicationListener(stack, "ApplicationListener", {
      ...app,
      loadBalancer: getLoadBalancer(stack),
      defaultAction: ListenerAction.forward([getAppTargetGroup(stack)]),
      certificates: [{ certificateArn: "" }],
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
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

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
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

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
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

    GuTemplate.fromStack(stack).hasResourceWithLogicalId(
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

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
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
    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      Certificates: [
        {
          CertificateArn: {
            Ref: "CertificateTesting28FCAC6D",
          },
        },
      ],
    });
  });

  test("sets the port to 8080 if a certificate is not supplied", () => {
    const stack = simpleGuStackForTesting();

    new GuHttpsApplicationListener(stack, "ApplicationListener", {
      loadBalancer: getLoadBalancer(stack),
      targetGroup: getAppTargetGroup(stack),
      ...app,
    });
    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      Port: 8080,
    });
  });

  test("sets the protocol to http if a certificate is not supplied", () => {
    const stack = simpleGuStackForTesting();

    new GuHttpsApplicationListener(stack, "ApplicationListener", {
      loadBalancer: getLoadBalancer(stack),
      targetGroup: getAppTargetGroup(stack),
      ...app,
    });
    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      Protocol: "HTTP",
    });
  });
});
