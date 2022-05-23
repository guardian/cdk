import { Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { GuTemplate, simpleGuStackForTesting } from "../../utils/test";
import type { AppIdentity } from "../core";
import { GuClassicLoadBalancer, GuHttpsClassicLoadBalancer } from "./elb";

describe("The GuClassicLoadBalancer class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
    privateSubnetIds: [""],
  });

  const app: AppIdentity = { app: "testing" };

  test("applies the App tag", () => {
    const stack = simpleGuStackForTesting();
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", { ...app, vpc });

    GuTemplate.fromStack(stack).hasGuTaggedResource("AWS::ElasticLoadBalancing::LoadBalancer", {
      appIdentity: { app: "testing" },
    });
  });

  test("overrides any properties as required", () => {
    const stack = simpleGuStackForTesting();
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", {
      ...app,
      vpc,
      propertiesToOverride: {
        AccessLoggingPolicy: {
          EmitInterval: 5,
          Enabled: true,
        },
      },
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancing::LoadBalancer", {
      AccessLoggingPolicy: {
        EmitInterval: 5,
        Enabled: true,
      },
    });
  });

  test("uses default health check properties", () => {
    const stack = simpleGuStackForTesting();
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", {
      ...app,
      vpc,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancing::LoadBalancer", {
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
      ...app,
      vpc,
      healthCheck: {
        path: "/test",
      },
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancing::LoadBalancer", {
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

describe("The GuHttpsClassicLoadBalancer class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
    privateSubnetIds: [""],
  });

  const app: AppIdentity = { app: "testing" };

  test("uses default listener values", () => {
    const stack = simpleGuStackForTesting();
    new GuHttpsClassicLoadBalancer(stack, "HttpsClassicLoadBalancer", {
      ...app,
      vpc,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancing::LoadBalancer", {
      Listeners: [
        {
          InstancePort: "9000",
          InstanceProtocol: "http",
          LoadBalancerPort: "443",
          Protocol: "https",
          SSLCertificateId: {
            Ref: "CertificateARN",
          },
        },
      ],
    });
  });

  test("adds the CertificateARN parameter if no value provided", () => {
    const stack = simpleGuStackForTesting();
    new GuHttpsClassicLoadBalancer(stack, "HttpsClassicLoadBalancer", {
      ...app,
      vpc,
    });

    Template.fromStack(stack).hasParameter("CertificateARN", {
      AllowedPattern: "arn:aws:[a-z0-9]*:[a-z0-9\\-]*:[0-9]{12}:.*",
      Description: "Certificate ARN for ELB",
      ConstraintDescription: "Must be a valid ARN, eg: arn:partition:service:region:account-id:resource-id",
      Type: "String",
    });
  });

  test("uses the certificate id provided", () => {
    const stack = simpleGuStackForTesting();
    new GuHttpsClassicLoadBalancer(stack, "HttpsClassicLoadBalancer", {
      ...app,
      vpc,
      listener: {
        sslCertificateArn: "certificateId",
      },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::ElasticLoadBalancing::LoadBalancer", {
      Listeners: [
        {
          InstancePort: "9000",
          InstanceProtocol: "http",
          LoadBalancerPort: "443",
          Protocol: "https",
          SSLCertificateId: "certificateId",
        },
      ],
    });

    expect(template.findParameters("*")).toMatchObject({});
  });

  test("merges any listener values provided", () => {
    const stack = simpleGuStackForTesting();
    new GuHttpsClassicLoadBalancer(stack, "HttpsClassicLoadBalancer", {
      ...app,
      vpc,
      listener: {
        internalPort: 3000,
      },
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancing::LoadBalancer", {
      Listeners: [
        {
          InstancePort: "3000",
          InstanceProtocol: "http",
          LoadBalancerPort: "443",
          Protocol: "https",
          SSLCertificateId: {
            Ref: "CertificateARN",
          },
        },
      ],
    });
  });

  test("Removes Scheme if user asks us to", () => {
    const stack = simpleGuStackForTesting();
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", {
      ...app,
      vpc,
      removeScheme: true,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancing::LoadBalancer", {
      Scheme: Match.absent(),
    });
  });
});
