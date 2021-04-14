import "@aws-cdk/assert/jest";
import "../../utils/test/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import { Vpc } from "@aws-cdk/aws-ec2";
import { Stack } from "@aws-cdk/core";
import { simpleGuStackForTesting } from "../../utils/test";
import type { SynthedStack } from "../../utils/test";
import { GuClassicLoadBalancer, GuHttpsClassicLoadBalancer } from "./elb";

describe("The GuClassicLoadBalancer class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
    privateSubnetIds: [""],
  });

  test("overrides the logicalId when existingLogicalId is set in a migrating stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", { vpc, existingLogicalId: "MyCLB" });

    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::ElasticLoadBalancing::LoadBalancer", "MyCLB");
  });

  test("auto-generates the logicalId by default", () => {
    const stack = simpleGuStackForTesting();
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", { vpc });

    expect(stack).toHaveResourceOfTypeAndLogicalId(
      "AWS::ElasticLoadBalancing::LoadBalancer",
      /^ClassicLoadBalancer.+$/
    );
  });

  test("overrides any properties as required", () => {
    const stack = simpleGuStackForTesting();
    new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", {
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

describe("The GuHttpsClassicLoadBalancer class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
    privateSubnetIds: [""],
  });

  test("uses default listener values", () => {
    const stack = simpleGuStackForTesting();
    new GuHttpsClassicLoadBalancer(stack, "HttpsClassicLoadBalancer", {
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
      vpc,
      listener: {
        sslCertificateId: "certificateId",
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

    expect(Object.keys(json.Parameters)).not.toContain("CertificateARN");
  });

  test("merges any listener values provided", () => {
    const stack = simpleGuStackForTesting();
    new GuHttpsClassicLoadBalancer(stack, "HttpsClassicLoadBalancer", {
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
});
