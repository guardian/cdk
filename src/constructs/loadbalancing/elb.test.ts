import "@aws-cdk/assert/jest";
import "../../utils/test/jest";
import { Stack } from "aws-cdk-lib";
import { SynthUtils } from "aws-cdk-lib/assert/lib/synth-utils";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { simpleGuStackForTesting } from "../../utils/test";
import type { SynthedStack } from "../../utils/test";
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

  test("overrides the logicalId when existingLogicalId is set in a migrating stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", {
      ...app,
      vpc,
      existingLogicalId: { logicalId: "MyCLB", reason: "testing" },
    });

    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::ElasticLoadBalancing::LoadBalancer", "MyCLB");
  });

  test("auto-generates the logicalId by default", () => {
    const stack = simpleGuStackForTesting();
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", { ...app, vpc });

    expect(stack).toHaveResourceOfTypeAndLogicalId(
      "AWS::ElasticLoadBalancing::LoadBalancer",
      /^ClassicLoadBalancerTesting.+$/
    );
  });

  test("applies the App tag", () => {
    const stack = simpleGuStackForTesting();
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", { ...app, vpc });

    expect(stack).toHaveGuTaggedResource("AWS::ElasticLoadBalancing::LoadBalancer", {
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
      ...app,
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
      ...app,
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

    expect(stack).toHaveResource("AWS::ElasticLoadBalancing::LoadBalancer", {
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

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.CertificateARN).toEqual({
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

    expect(stack).toHaveResource("AWS::ElasticLoadBalancing::LoadBalancer", {
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

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters).toBeUndefined();
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

    expect(stack).toHaveResource("AWS::ElasticLoadBalancing::LoadBalancer", {
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
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", {
      ...app,
      vpc,
      removeScheme: true,
      existingLogicalId: { logicalId: "ClassicLoadBalancer", reason: "testing" },
    });
    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources.ClassicLoadBalancer.Properties)).not.toContain("Scheme");
  });
});
