import { Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { ApplicationProtocol, ListenerAction } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { GuTemplate, simpleTestingResources } from "../../../utils/test";
import { GuCertificate } from "../../acm";
import type { GuApp } from "../../core";
import { GuApplicationListener, GuHttpsApplicationListener } from "./application-listener";
import { GuApplicationLoadBalancer } from "./application-load-balancer";
import { GuApplicationTargetGroup } from "./application-target-group";

const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
  vpcId: "test",
  availabilityZones: [""],
  publicSubnetIds: [""],
});

const getLoadBalancer = (stack: GuApp): GuApplicationLoadBalancer => {
  return new GuApplicationLoadBalancer(stack, "ApplicationLoadBalancer", { vpc });
};

const getCertificate = (stack: GuApp): GuCertificate => {
  return new GuCertificate(stack, {
    domainName: "code-guardian.com",
  });
};

const getAppTargetGroup = (stack: GuApp): GuApplicationTargetGroup => {
  return new GuApplicationTargetGroup(stack, "TargetGroup", {
    vpc,
    protocol: ApplicationProtocol.HTTP,
  });
};

describe("The GuApplicationListener class", () => {
  it("should use the AppIdentity to form its auto-generated logicalId", () => {
    const { stack, app } = simpleTestingResources();

    new GuApplicationListener(app, "ApplicationListener", {
      loadBalancer: getLoadBalancer(app),
      defaultAction: ListenerAction.forward([getAppTargetGroup(app)]),
      certificates: [{ certificateArn: "" }],
    });

    GuTemplate.fromStack(stack).hasResourceWithLogicalId(
      "AWS::ElasticLoadBalancingV2::Listener",
      /ApplicationListenerTesting.+/
    );
  });

  test("sets default props", () => {
    const { stack, app } = simpleTestingResources();

    new GuApplicationListener(app, "ApplicationListener", {
      loadBalancer: getLoadBalancer(app),
      defaultAction: ListenerAction.forward([getAppTargetGroup(app)]),
      certificates: [{ certificateArn: "" }],
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      Port: 443,
      Protocol: "HTTPS",
    });
  });

  test("merges default and passed in props", () => {
    const { stack, app } = simpleTestingResources();

    new GuApplicationListener(app, "ApplicationListener", {
      loadBalancer: getLoadBalancer(app),
      defaultAction: ListenerAction.forward([getAppTargetGroup(app)]),
      certificates: [{ certificateArn: "" }],
      port: 80,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      Port: 80,
      Protocol: "HTTPS",
    });
  });

  test("Can override default protocol with prop", () => {
    const { stack, app } = simpleTestingResources();

    new GuApplicationListener(app, "Listener", {
      loadBalancer: getLoadBalancer(app),
      defaultTargetGroups: [getAppTargetGroup(app)],

      protocol: ApplicationProtocol.HTTP,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      Protocol: "HTTP",
    });
  });
});

describe("The GuHttpsApplicationListener class", () => {
  it("should use the AppIdentity to form its auto-generated logicalId", () => {
    const { stack, app } = simpleTestingResources();

    new GuHttpsApplicationListener(app, "HttpsApplicationListener", {
      certificate: getCertificate(app),
      loadBalancer: getLoadBalancer(app),
      targetGroup: getAppTargetGroup(app),
    });

    GuTemplate.fromStack(stack).hasResourceWithLogicalId(
      "AWS::ElasticLoadBalancingV2::Listener",
      /^HttpsApplicationListenerTesting.+/
    );
  });

  test("sets default props", () => {
    const { stack, app } = simpleTestingResources();

    new GuHttpsApplicationListener(app, "ApplicationListener", {
      certificate: getCertificate(app),
      loadBalancer: getLoadBalancer(app),
      targetGroup: getAppTargetGroup(app),
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
    const { stack, app } = simpleTestingResources();

    new GuHttpsApplicationListener(app, "ApplicationListener", {
      certificate: getCertificate(app),
      loadBalancer: getLoadBalancer(app),
      targetGroup: getAppTargetGroup(app),
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
});
