import { App, Duration } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import {
  BlockDeviceVolume,
  type CfnAutoScalingGroup,
  CfnScalingPolicy,
  EbsDeviceVolumeType,
  UpdatePolicy,
} from "aws-cdk-lib/aws-autoscaling";
import { InstanceClass, InstanceSize, InstanceType, Peer, Port, UserData, Vpc } from "aws-cdk-lib/aws-ec2";
import type { CfnLoadBalancer } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { AccessScope, MetadataKeys } from "../../constants";
import { GuUserData } from "../../constructs/autoscaling";
import type { NoMonitoring } from "../../constructs/cloudwatch";
import { GuPrivateConfigBucketParameter, GuStack, type GuStackProps } from "../../constructs/core";
import { GuSecurityGroup } from "../../constructs/ec2";
import { GuDynamoDBWritePolicy } from "../../constructs/iam";
import type { AppAccess, GuAsgCapacity } from "../../types";
import { getTemplateAfterAspectInvocation, GuTemplate, simpleGuStackForTesting } from "../../utils/test";
import { RollingUpdateDurations } from "./ec2-app";
import { GuLoadBalancedAppExperimental } from "./gu-load-balanced-app";

describe("the GuLoadBalancedAppExperimental pattern should support new ECS and hybrid functionality", function () {
  it("should produce a functional ECS app with minimal arguments", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      monitoringConfiguration: { noMonitoring: true },
      applicationPort: 3000,
      access: { scope: AccessScope.PUBLIC },
      app: "test-gu",
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      ecsProps: {
        cpu: 1024,
        memoryLimitMiB: 2048,
        scaling: { minimumTasks: 3, maximumTasks: 6 },
        imageIdentifier: "sha256:12345",
      },
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
  it("should be capable of splitting traffic between EC2 and ECS target groups", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const { targetGroups } = new GuLoadBalancedAppExperimental(stack, {
      monitoringConfiguration: { noMonitoring: true },
      applicationPort: 3000,
      access: { scope: AccessScope.PUBLIC },
      app: "test-gu",
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
      },
      ecsProps: {
        cpu: 1024,
        memoryLimitMiB: 2048,
        scaling: { minimumTasks: 3, maximumTasks: 6 },
        imageIdentifier: "sha256:12345",
      },
      targetGroupWeights: {
        ec2: 499,
        ecs: 500,
      },
    });
    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      DefaultActions: [
        {
          ForwardConfig: {
            TargetGroups: [
              {
                TargetGroupArn: stack.resolve(targetGroups.ec2!.targetGroupArn) as string,
                Weight: 499,
              },
              {
                TargetGroupArn: stack.resolve(targetGroups.ecs!.targetGroupArn) as string,
                Weight: 500,
              },
            ],
          },
        },
      ],
    });
  });
  it("should throw an error if EC2 and ECS are both present but no weights are provided", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    expect(
      () =>
        new GuLoadBalancedAppExperimental(stack, {
          monitoringConfiguration: { noMonitoring: true },
          applicationPort: 3000,
          access: { scope: AccessScope.PUBLIC },
          app: "test-gu",
          certificateProps: {
            domainName: "domain-name-for-your-application.example",
          },
          ec2Props: {
            instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
            instanceMetricGranularity: "5Minute",
            userData: UserData.forLinux(),
            scaling: {
              minimumInstances: 1,
            },
          },
          ecsProps: {
            cpu: 1024,
            memoryLimitMiB: 2048,
            scaling: { minimumTasks: 3, maximumTasks: 6 },
            imageIdentifier: "sha256:12345",
          },
        }),
    ).toThrow("EC2 and ECS are both enabled but no target group weights were provided");
  });
  it("should throw an error if illegal weights are provided", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    expect(
      () =>
        new GuLoadBalancedAppExperimental(stack, {
          monitoringConfiguration: { noMonitoring: true },
          applicationPort: 3000,
          access: { scope: AccessScope.PUBLIC },
          app: "test-gu",
          certificateProps: {
            domainName: "domain-name-for-your-application.example",
          },
          ec2Props: {
            instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
            instanceMetricGranularity: "5Minute",
            userData: UserData.forLinux(),
            scaling: {
              minimumInstances: 1,
            },
          },
          ecsProps: {
            cpu: 1024,
            memoryLimitMiB: 2048,
            scaling: { minimumTasks: 3, maximumTasks: 6 },
            imageIdentifier: "sha256:12345",
          },
          targetGroupWeights: {
            ec2: 1000, // Outside of limit
            ecs: 1,
          },
        }),
    ).toThrow("targetGroupWeights.ec2 must be between 0 and 999");
  });
  it("should throw an error if EC2 and ECS props are both omitted", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    expect(
      () =>
        new GuLoadBalancedAppExperimental(stack, {
          monitoringConfiguration: { noMonitoring: true },
          applicationPort: 3000,
          access: { scope: AccessScope.PUBLIC },
          app: "test-gu",
          certificateProps: {
            domainName: "domain-name-for-your-application.example",
          },
        }),
    ).toThrow("At least one of 'ec2Props' or 'ecsProps' must be specified");
  });
  it("should use the ECR repo name from ecsProps if the user sets this explicitly", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      monitoringConfiguration: { noMonitoring: true },
      applicationPort: 3000,
      access: { scope: AccessScope.PUBLIC },
      app: "test-gu",
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      ecsProps: {
        cpu: 1024,
        memoryLimitMiB: 2048,
        scaling: { minimumTasks: 3, maximumTasks: 6 },
        imageIdentifier: "sha256:12345",
        repositoryName: "guardian/some-other-repo",
      },
    });
    Template.fromStack(stack).hasResourceProperties("AWS::ECS::TaskDefinition", {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Image: {
            "Fn::Join": ["", Match.arrayWith(["/guardian/some-other-repo@sha256:12345"])],
          },
        }),
      ]),
    });
  });
  it("should throw an error if we cannot determine the right repository for ECR", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    // Remove the repositoryName
    Object.defineProperty(stack, "repositoryName", { value: undefined });
    expect(
      () =>
        new GuLoadBalancedAppExperimental(stack, {
          monitoringConfiguration: { noMonitoring: true },
          applicationPort: 3000,
          access: { scope: AccessScope.PUBLIC },
          app: "test-gu",
          certificateProps: {
            domainName: "domain-name-for-your-application.example",
          },
          ecsProps: {
            cpu: 1024,
            memoryLimitMiB: 2048,
            scaling: { minimumTasks: 3, maximumTasks: 6 },
            imageIdentifier: "sha256:12345",
          },
        }),
    ).toThrow("Could not determine an ECR repository name; please set this manually via ecsProps");
  });
  it("allows a custom healthcheck to be used for the ECS target group", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      monitoringConfiguration: { noMonitoring: true },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      healthcheck: {
        path: "/custom-healthcheck",
      },
      ecsProps: {
        cpu: 1024,
        memoryLimitMiB: 2048,
        scaling: { minimumTasks: 3, maximumTasks: 6 },
        imageIdentifier: "sha256:12345",
      },
    });
    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      HealthCheckPath: "/custom-healthcheck",
      TargetType: "ip", // This target type helps to confirm that its the ECS target group
    });
  });
  it("applies the custom healthcheck settings to both target groups when operating in hybrid mode", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      monitoringConfiguration: { noMonitoring: true },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      healthcheck: {
        path: "/custom-healthcheck",
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
      },
      ecsProps: {
        cpu: 1024,
        memoryLimitMiB: 2048,
        scaling: { minimumTasks: 3, maximumTasks: 6 },
        imageIdentifier: "sha256:12345",
      },
      targetGroupWeights: {
        ec2: 499,
        ecs: 500,
      },
    });
    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      HealthCheckPath: "/custom-healthcheck",
      TargetType: "instance", // The EC2 target group
    });
    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      HealthCheckPath: "/custom-healthcheck",
      TargetType: "ip", // The ECS target group
    });
  });
  // Because this has not been tested thoroughly yet
  it("should throw an error if there is an ECS backend and the Google Auth feature is being used", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const domain = "domain-name-for-your-application.example";
    expect(
      () =>
        new GuLoadBalancedAppExperimental(stack, {
          monitoringConfiguration: { noMonitoring: true },
          applicationPort: 3000,
          access: { scope: AccessScope.PUBLIC },
          app: "test-gu",
          certificateProps: {
            domainName: domain,
          },
          ec2Props: {
            instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
            instanceMetricGranularity: "5Minute",
            userData: UserData.forLinux(),
            scaling: {
              minimumInstances: 1,
            },
          },
          ecsProps: {
            cpu: 1024,
            memoryLimitMiB: 2048,
            scaling: { minimumTasks: 3, maximumTasks: 6 },
            imageIdentifier: "sha256:12345",
            repositoryName: "my-repository",
          },
          targetGroupWeights: {
            ec2: 899,
            ecs: 100,
          },
          googleAuth: {
            enabled: true,
            domain,
          },
        }),
    ).toThrow("Using Google Auth with ECS is currently unsupported");
  });
});

describe("the GuLoadBalancedAppExperimental pattern should support all existing GuEc2App functionality", function () {
  it("should produce a functional EC2 app with minimal arguments", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: "test-gu",
      access: { scope: AccessScope.PUBLIC },
      monitoringConfiguration: { noMonitoring: true },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
      },
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("can produce a restricted EC2 app locked to specific CIDR ranges", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.RESTRICTED, cidrRanges: [Peer.ipv4("1.2.3.4/5")] },
      monitoringConfiguration: { noMonitoring: true },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
      },
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("can produce an EC2 app with an internal load balancer (located in private subnets)", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.INTERNAL, cidrRanges: [Peer.ipv4("10.0.0.0/8")] },
      monitoringConfiguration: { noMonitoring: true },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
      },
    });
    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      Scheme: "internal",
      Subnets: {
        Ref: "testguec2appPrivateSubnets",
      },
    });
  });

  it("adds the correct permissions for apps which need to fetch private config from s3", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app,
      access: { scope: AccessScope.PUBLIC },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      monitoringConfiguration: { noMonitoring: true },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: {
          distributable: {
            fileName: "my-app.deb",
            executionStatement: `dpkg -i /${app}/my-app.deb`,
          },
          configuration: {
            bucket: new GuPrivateConfigBucketParameter(stack),
            files: ["secrets.json", "application.conf"],
          },
        },
        scaling: {
          minimumInstances: 1,
        },
      },
    });
    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "s3:GetObject",
            Resource: [
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:s3:::",
                    {
                      Ref: "PrivateConfigBucketName",
                    },
                    "/secrets.json",
                  ],
                ],
              },
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:s3:::",
                    {
                      Ref: "PrivateConfigBucketName",
                    },
                    "/application.conf",
                  ],
                ],
              },
            ],
          },
        ],
      },
    });
  });

  it("creates a High5xxPercentageAlarm if the relevant monitoringConfiguration is provided", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app,
      access: { scope: AccessScope.PUBLIC },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      monitoringConfiguration: {
        snsTopicName: "test-topic",
        // Note: http4xxAlarm is not a required parameter
        http5xxAlarm: {
          tolerated5xxPercentage: 5,
        },
        unhealthyInstancesAlarm: false,
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        scaling: {
          minimumInstances: 1,
        },
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
      },
    });
    //The shape of this alarm is tested at construct level
    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::CloudWatch::Alarm", /^High5xxPercentageAlarm.+/);
  });

  it("creates a High4xxPercentageAlarm if the relevant monitoringConfiguration is provided", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app,
      access: { scope: AccessScope.PUBLIC },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      monitoringConfiguration: {
        snsTopicName: "test-topic",
        http5xxAlarm: false,
        http4xxAlarm: {
          tolerated4xxPercentage: 5,
        },
        unhealthyInstancesAlarm: false,
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        scaling: {
          minimumInstances: 1,
        },
        userData: UserData.forLinux(),
        instanceMetricGranularity: "5Minute",
      },
    });
    //The shape of this alarm is tested at construct level
    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::CloudWatch::Alarm", /^High4xxPercentageAlarm.+/);
  });

  it("creates an UnhealthyInstancesAlarm if the user enables it", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app,
      access: { scope: AccessScope.PUBLIC },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      monitoringConfiguration: {
        snsTopicName: "test-topic",
        http5xxAlarm: false,
        unhealthyInstancesAlarm: true,
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
      },
    });
    //The shape of this alarm is tested at construct level
    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::CloudWatch::Alarm", /^UnhealthyInstancesAlarm.+/);
  });

  it("Skips alarm creation if the user explicitly opts-out", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app,
      access: { scope: AccessScope.PUBLIC },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      monitoringConfiguration: {
        snsTopicName: "test-topic",
        http5xxAlarm: false,
        unhealthyInstancesAlarm: false,
      },
      ec2Props: {
        scaling: {
          minimumInstances: 1,
        },
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
      },
    });
    Template.fromStack(stack).resourceCountIs("AWS::CloudWatch::Alarm", 0);
  });

  it("creates the appropriate ingress rules for a restricted access application", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: app,
      access: { scope: AccessScope.RESTRICTED, cidrRanges: [Peer.ipv4("192.168.1.1/32"), Peer.ipv4("8.8.8.8/32")] },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      monitoringConfiguration: { noMonitoring: true },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
      },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::EC2::SecurityGroup", {
      GroupDescription: "Allow restricted ingress from CIDR ranges",
      SecurityGroupIngress: [
        {
          CidrIp: "192.168.1.1/32",
          Description: "Allow access on port 443 from 192.168.1.1/32",
          FromPort: 443,
          IpProtocol: "tcp",
          ToPort: 443,
        },
        {
          CidrIp: "8.8.8.8/32",
          Description: "Allow access on port 443 from 8.8.8.8/32",
          FromPort: 443,
          IpProtocol: "tcp",
          ToPort: 443,
        },
      ],
    });

    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      SecurityGroups: Match.arrayWith([
        {
          "Fn::GetAtt": [Match.stringLikeRegexp("RestrictedIngressSecurityGroupTest"), "GroupId"],
        },
      ]),
    });
  });

  it("allows all connections if set to public", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: app,
      access: { scope: AccessScope.PUBLIC },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      monitoringConfiguration: { noMonitoring: true },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
      },
    });

    Template.fromStack(stack).hasResourceProperties("AWS::EC2::SecurityGroup", {
      SecurityGroupIngress: [
        {
          CidrIp: "0.0.0.0/0",
          Description: "Allow from anyone on port 443",
          FromPort: 443,
          IpProtocol: "tcp",
          ToPort: 443,
        },
      ],
    });
  });

  it("errors if specifying open access as well as specific CIDR ranges", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    expect(
      () =>
        new GuLoadBalancedAppExperimental(stack, {
          applicationPort: 3000,
          access: { scope: AccessScope.RESTRICTED, cidrRanges: [Peer.ipv4("0.0.0.0/0"), Peer.ipv4("1.2.3.4/32")] },
          app: app,
          certificateProps: {
            domainName: "domain-name-for-your-application.example",
          },
          monitoringConfiguration: { noMonitoring: true },
          ec2Props: {
            instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
            instanceMetricGranularity: "5Minute",
            userData: UserData.forLinux(),
            scaling: {
              minimumInstances: 1,
            },
          },
        }),
    ).toThrow(
      "Restricted apps cannot be globally accessible. Adjust CIDR ranges (0.0.0.0/0, 1.2.3.4/32) or use Public.",
    );
  });

  it("errors if specifying public CIDR ranges with internal access scope", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    expect(
      () =>
        new GuLoadBalancedAppExperimental(stack, {
          applicationPort: 3000,
          access: { scope: AccessScope.INTERNAL, cidrRanges: [Peer.ipv4("93.1.2.3/12")] },
          app: app,
          certificateProps: {
            domainName: "domain-name-for-your-application.example",
          },
          monitoringConfiguration: { noMonitoring: true },
          ec2Props: {
            instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
            instanceMetricGranularity: "5Minute",
            userData: UserData.forLinux(),
            scaling: {
              minimumInstances: 1,
            },
          },
        }),
    ).toThrow(
      "Internal apps should only be accessible on 10. ranges. Adjust CIDR ranges (93.1.2.3/12) or use Restricted.",
    );
  });

  it("correctly wires up custom role configuration", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      access: { scope: AccessScope.PUBLIC },
      app: app,
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      monitoringConfiguration: { noMonitoring: true },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        scaling: {
          minimumInstances: 1,
        },
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        roleConfiguration: {
          withoutLogShipping: true,
          additionalPolicies: [new GuDynamoDBWritePolicy(stack, "DynamoTable", { tableName: "my-dynamo-table" })],
        },
      },
    });

    const template = Template.fromStack(stack);

    // test parameter doesn't exist as `withoutLogShipping = true`
    expect(template.findParameters("LoggingStreamName")).toMatchObject({});

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.not({
        Version: "2012-10-17",
        Statement: [
          {
            Action: ["kinesis:Describe*", "kinesis:Put*"],
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:aws:kinesis:eu-west-1:",
                  {
                    Ref: "AWS::AccountId",
                  },
                  ":stream/",
                  {
                    Ref: "LoggingStreamName",
                  },
                ],
              ],
            },
          },
        ],
      }),
    });

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: ["dynamodb:BatchWriteItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:UpdateItem"],
            Effect: "Allow",
            Resource: [
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:dynamodb:eu-west-1:",
                    {
                      Ref: "AWS::AccountId",
                    },
                    ":table/my-dynamo-table",
                  ],
                ],
              },
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:dynamodb:eu-west-1:",
                    {
                      Ref: "AWS::AccountId",
                    },
                    ":table/my-dynamo-table/index/*",
                  ],
                ],
              },
            ],
          },
        ],
      },
    });
  });

  it("sub-constructs can be accessed and modified after declaring the pattern", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    const pattern = new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: app,
      access: { scope: AccessScope.RESTRICTED, cidrRanges: [] },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      monitoringConfiguration: { noMonitoring: true },
      ec2Props: {
        scaling: {
          minimumInstances: 1,
        },
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux({ shebang: "#!/user/data/from/pattern" }),
      },
    });

    expect(pattern.autoScalingGroup!.userData.render()).toEqual(`#!/user/data/from/pattern`);

    pattern.autoScalingGroup!.addUserData("UserData from accessed construct");

    expect(pattern.autoScalingGroup!.userData.render()).toEqual(`#!/user/data/from/pattern
UserData from accessed construct`);
  });

  it("users can optionally configure block devices", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: app,
      access: { scope: AccessScope.PUBLIC },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      monitoringConfiguration: { noMonitoring: true },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
        blockDevices: [
          {
            deviceName: "/dev/sda1",
            volume: BlockDeviceVolume.ebs(8, {
              volumeType: EbsDeviceVolumeType.GP2,
            }),
          },
        ],
      },
    });

    Template.fromStack(stack).hasResourceProperties("AWS::EC2::LaunchTemplate", {
      LaunchTemplateData: {
        BlockDeviceMappings: [
          {
            DeviceName: "/dev/sda1",
            Ebs: {
              VolumeSize: 8,
              VolumeType: "gp2",
            },
          },
        ],
      },
    });
  });

  it("users can override resources and constructs if desired", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    const pattern = new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app,
      access: { scope: AccessScope.PUBLIC },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      monitoringConfiguration: { noMonitoring: true },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
      },
    });

    const cfnLb = pattern.loadBalancer.node.defaultChild as CfnLoadBalancer;

    const sg = new GuSecurityGroup(stack, "SG", {
      app,
      vpc: Vpc.fromVpcAttributes(stack, "VPC", {
        vpcId: "test",
        availabilityZones: [""],
        publicSubnetIds: [""],
        privateSubnetIds: [""],
      }),
      ingresses: [{ port: Port.tcp(1234), range: Peer.ipv4("8.8.8.8/32"), description: "" }],
    });

    cfnLb.securityGroups = [sg.securityGroupId];

    Template.fromStack(stack).hasResourceProperties("AWS::EC2::SecurityGroup", {
      SecurityGroupIngress: [
        {
          CidrIp: "8.8.8.8/32",
          Description: "",
          FromPort: 1234,
          IpProtocol: "tcp",
          ToPort: 1234,
        },
      ],
    });
  });

  it("can handle multiple EC2 apps in a single stack", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: "NodeApp",
      access: { scope: AccessScope.PUBLIC },
      monitoringConfiguration: { noMonitoring: true },
      certificateProps: {
        domainName: "node-app.code.example.com",
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
      },
    });

    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 9000,
      app: "PlayApp",
      access: { scope: AccessScope.PUBLIC },
      monitoringConfiguration: { noMonitoring: true },
      certificateProps: {
        domainName: "play-app.code.example.com",
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        scaling: {
          minimumInstances: 3,
        },
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
      },
    });

    const template = GuTemplate.fromStack(stack);

    template.hasGuTaggedResource("AWS::AutoScaling::AutoScalingGroup", {
      appIdentity: { app: "PlayApp" },
      propagateAtLaunch: true,
      additionalTags: [{ Key: MetadataKeys.LOG_KINESIS_STREAM_NAME, Value: { Ref: "LoggingStreamName" } }],
    });

    template.hasGuTaggedResource("AWS::AutoScaling::AutoScalingGroup", {
      appIdentity: { app: "NodeApp" },
      propagateAtLaunch: true,
      additionalTags: [{ Key: MetadataKeys.LOG_KINESIS_STREAM_NAME, Value: { Ref: "LoggingStreamName" } }],
    });
  });

  describe("Access logging behaviour", function () {
    it("is enabled by default", function () {
      const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
      const app = "test-gu-ec2-app";
      new GuLoadBalancedAppExperimental(stack, {
        applicationPort: 3000,
        access: { scope: AccessScope.PUBLIC },
        app,
        certificateProps: {
          domainName: "domain-name-for-your-application.example",
        },
        monitoringConfiguration: { noMonitoring: true },
        ec2Props: {
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
          instanceMetricGranularity: "5Minute",
          userData: UserData.forLinux(),
          scaling: {
            minimumInstances: 1,
          },
        },
      });

      Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
        LoadBalancerAttributes: Match.arrayWith([
          { Key: "deletion_protection.enabled", Value: "true" },
          { Key: "access_logs.s3.enabled", Value: "true" },
          { Key: "access_logs.s3.bucket", Value: { Ref: "AccessLoggingBucket" } },
          {
            Key: "access_logs.s3.prefix",
            Value: `application-load-balancer/TEST/test-stack/${app}`,
          },
        ]),
      });
    });

    it("can be disabled", function () {
      const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
      const app = "test-gu-ec2-app";
      new GuLoadBalancedAppExperimental(stack, {
        applicationPort: 3000,
        access: { scope: AccessScope.PUBLIC },
        app,
        certificateProps: {
          domainName: "domain-name-for-your-application.example",
        },
        monitoringConfiguration: { noMonitoring: true },
        withAccessLogging: false,
        ec2Props: {
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
          scaling: {
            minimumInstances: 1,
          },
          instanceMetricGranularity: "5Minute",
          userData: UserData.forLinux(),
        },
      });

      Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
        LoadBalancerAttributes: Match.arrayWith([
          {
            Key: "access_logs.s3.enabled",
            Value: "false",
          },
        ]),
      });
    });

    it("supports more than one EC2 app with load balancer access logs enabled", () => {
      const stack = simpleGuStackForTesting({
        env: {
          region: "test",
        },
      });

      new GuLoadBalancedAppExperimental(stack, {
        applicationPort: 3000,
        app: "test-gu-ec2-app-1",
        access: { scope: AccessScope.PUBLIC },
        monitoringConfiguration: { noMonitoring: true },
        certificateProps: {
          domainName: "domain-name-for-your-application.example",
        },
        ec2Props: {
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
          instanceMetricGranularity: "5Minute",
          userData: UserData.forLinux(),
          scaling: {
            minimumInstances: 1,
          },
          instanceMetadataHopLimit: 2,
        },
      });

      new GuLoadBalancedAppExperimental(stack, {
        applicationPort: 3000,
        app: "test-gu-ec2-app-2",
        access: { scope: AccessScope.PUBLIC },
        monitoringConfiguration: { noMonitoring: true },
        certificateProps: {
          domainName: "domain-name-for-your-application.example",
        },
        ec2Props: {
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
          instanceMetricGranularity: "5Minute",
          userData: UserData.forLinux(),
          scaling: {
            minimumInstances: 1,
          },
          instanceMetadataHopLimit: 2,
        },
      });

      Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
        Tags: Match.arrayWith([Match.objectLike({ Key: "App", Value: "test-gu-ec2-app-1" })]),
        LoadBalancerAttributes: Match.arrayWith([
          Match.objectLike({
            Key: "access_logs.s3.prefix",
            Value: "application-load-balancer/TEST/test-stack/test-gu-ec2-app-1",
          }),
        ]),
      });

      Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
        Tags: Match.arrayWith([Match.objectLike({ Key: "App", Value: "test-gu-ec2-app-2" })]),
        LoadBalancerAttributes: Match.arrayWith([
          Match.objectLike({
            Key: "access_logs.s3.prefix",
            Value: "application-load-balancer/TEST/test-stack/test-gu-ec2-app-2",
          }),
        ]),
      });
    });
  });

  it("can be configured with application logging", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      access: { scope: AccessScope.PUBLIC },
      app,
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      monitoringConfiguration: { noMonitoring: true },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        scaling: {
          minimumInstances: 1,
        },
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        applicationLogging: { enabled: true },
      },
    });

    GuTemplate.fromStack(stack).hasGuTaggedResource("AWS::AutoScaling::AutoScalingGroup", {
      appIdentity: { app },
      propagateAtLaunch: true,
      additionalTags: [
        { Key: MetadataKeys.LOG_KINESIS_STREAM_NAME, Value: { Ref: "LoggingStreamName" } },
        { Key: MetadataKeys.SYSTEMD_UNIT, Value: "test-gu-ec2-app.service" },
      ],
    });
  });

  it("can be configured with application logging using a custom systemd unit name", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      access: { scope: AccessScope.PUBLIC },
      app,
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      monitoringConfiguration: { noMonitoring: true },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        scaling: {
          minimumInstances: 1,
        },
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        applicationLogging: { enabled: true, systemdUnitName: "not-my-app-name" },
      },
    });

    GuTemplate.fromStack(stack).hasGuTaggedResource("AWS::AutoScaling::AutoScalingGroup", {
      appIdentity: { app },
      propagateAtLaunch: true,
      additionalTags: [
        { Key: MetadataKeys.LOG_KINESIS_STREAM_NAME, Value: { Ref: "LoggingStreamName" } },
        { Key: MetadataKeys.SYSTEMD_UNIT, Value: "not-my-app-name.service" },
      ],
    });
  });

  it("throws an error if users attempt to ship application logs without the appropriate IAM permissions", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    expect(() => {
      new GuLoadBalancedAppExperimental(stack, {
        applicationPort: 3000,
        access: { scope: AccessScope.PUBLIC },
        app,
        certificateProps: {
          domainName: "domain-name-for-your-application.example",
        },
        monitoringConfiguration: { noMonitoring: true },
        ec2Props: {
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
          scaling: {
            minimumInstances: 1,
          },
          instanceMetricGranularity: "5Minute",
          userData: UserData.forLinux(),
          applicationLogging: { enabled: true },
          roleConfiguration: {
            withoutLogShipping: true,
          },
        },
      });
    }).toThrow(
      "Application logging has been enabled (via the `applicationLogging` prop) but your `roleConfiguration` sets " +
        "`withoutLogShipping` to true. Please turn off application logging or remove `withoutLogShipping`",
    );
  });

  it("adds a tag to aid visibility of stacks using the pattern", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "App";
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      access: { scope: AccessScope.PUBLIC },
      app,
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      monitoringConfiguration: { noMonitoring: true },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        scaling: {
          minimumInstances: 1,
        },
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
      },
    });

    GuTemplate.fromStack(stack).hasGuTaggedResource("AWS::AutoScaling::AutoScalingGroup", {
      appIdentity: { app },
      propagateAtLaunch: true,
      additionalTags: [{ Key: MetadataKeys.LOG_KINESIS_STREAM_NAME, Value: { Ref: "LoggingStreamName" } }],
    });
  });

  it("supports Google auth at the ALB", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "app";
    const domain = "domain-name-for-your-application.example";

    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      access: { scope: AccessScope.PUBLIC },
      app,
      certificateProps: {
        domainName: domain,
      },
      monitoringConfiguration: { noMonitoring: true },
      googleAuth: {
        enabled: true,
        domain,
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        scaling: {
          minimumInstances: 1,
        },
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
      },
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      DefaultActions: [
        {
          Type: "authenticate-cognito",
          Order: 1,
        },
        {
          Type: "forward",
          Order: 2,
        },
      ],
    });
  });

  it("throws when googleAuth.allowedGroups is empty", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "app";
    const domain = "domain-name-for-your-application.example";

    expect(
      () =>
        new GuLoadBalancedAppExperimental(stack, {
          applicationPort: 3000,
          access: { scope: AccessScope.PUBLIC },
          app,
          certificateProps: {
            domainName: domain,
          },
          monitoringConfiguration: { noMonitoring: true },
          googleAuth: {
            enabled: true,
            domain,
            allowedGroups: [],
          },
          ec2Props: {
            instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
            scaling: {
              minimumInstances: 1,
            },
            instanceMetricGranularity: "5Minute",
            userData: UserData.forLinux(),
          },
        }),
    ).toThrow("googleAuth.allowedGroups cannot be empty!");
  });

  it("throws when googleAuth.sessionTimeoutInMinutes is > 60", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "app";
    const domain = "domain-name-for-your-application.example";

    expect(
      () =>
        new GuLoadBalancedAppExperimental(stack, {
          applicationPort: 3000,
          access: { scope: AccessScope.PUBLIC },
          app,
          certificateProps: {
            domainName: domain,
          },
          monitoringConfiguration: { noMonitoring: true },
          googleAuth: {
            enabled: true,
            domain,
            sessionTimeoutInMinutes: 61,
          },
          ec2Props: {
            instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
            scaling: {
              minimumInstances: 1,
            },
            instanceMetricGranularity: "5Minute",
            userData: UserData.forLinux(),
          },
        }),
    ).toThrow("googleAuth.sessionTimeoutInMinutes must be <= 60!");
  });

  it("throws when googleAuth.allowedGroups contains groups using non-standard domains", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "app";
    const domain = "domain-name-for-your-application.example";

    expect(
      () =>
        new GuLoadBalancedAppExperimental(stack, {
          applicationPort: 3000,
          access: { scope: AccessScope.PUBLIC },
          app,
          certificateProps: {
            domainName: domain,
          },
          monitoringConfiguration: { noMonitoring: true },
          googleAuth: {
            enabled: true,
            domain,
            allowedGroups: ["apple@guardian.co.uk", "engineering@theguardian.com"],
          },
          ec2Props: {
            instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
            scaling: {
              minimumInstances: 1,
            },
            instanceMetricGranularity: "5Minute",
            userData: UserData.forLinux(),
          },
        }),
    ).toThrow("googleAuth.allowedGroups must use the @guardian.co.uk domain.");
  });

  it("should provides a default healthcheck", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      monitoringConfiguration: { noMonitoring: true },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
      },
    });
    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      HealthCheckIntervalSeconds: 10,
      HealthCheckPath: "/healthcheck",
      HealthCheckProtocol: "HTTP",
      HealthCheckTimeoutSeconds: 5,
      HealthyThresholdCount: 5,
    });
  });

  it("allows a custom healthcheck to be used for the EC2 target group", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      monitoringConfiguration: { noMonitoring: true },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      healthcheck: {
        path: "/custom-healthcheck",
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
      },
    });
    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      HealthCheckIntervalSeconds: 10,
      HealthCheckPath: "/custom-healthcheck",
      HealthCheckProtocol: "HTTP",
      HealthCheckTimeoutSeconds: 5,
      HealthyThresholdCount: 5,
      TargetType: "instance", // This target type helps to confirm that it's the EC2 target group
    });
  });

  it("can specify instance metadata hop limit", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      monitoringConfiguration: { noMonitoring: true },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
        instanceMetadataHopLimit: 2,
      },
    });
    Template.fromStack(stack).hasResourceProperties("AWS::EC2::LaunchTemplate", {
      LaunchTemplateData: {
        MetadataOptions: {
          HttpPutResponseHopLimit: 2,
          HttpTokens: "required",
        },
      },
    });
  });

  it("uses the latest security policy", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      monitoringConfiguration: { noMonitoring: true },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
        instanceMetadataHopLimit: 2,
      },
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      SslPolicy: "ELBSecurityPolicy-TLS13-1-2-2021-06",
    });
  });

  it("has a defined UpdatePolicy when provided with one", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });

    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      monitoringConfiguration: { noMonitoring: true },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
        instanceMetadataHopLimit: 2,
        updatePolicy: UpdatePolicy.replacingUpdate(),
      },
    });

    Template.fromStack(stack).hasResource("AWS::AutoScaling::AutoScalingGroup", {
      UpdatePolicy: {
        AutoScalingReplacingUpdate: {
          WillReplace: true,
        },
      },
    });
  });

  it("set detailed monitoring on the ASG launch template when set", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      monitoringConfiguration: { noMonitoring: true },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        userData: UserData.forLinux(),
        instanceMetricGranularity: "1Minute",
        scaling: {
          minimumInstances: 1,
        },
      },
    });
    Template.fromStack(stack).hasResource("AWS::EC2::LaunchTemplate", {
      Properties: {
        LaunchTemplateData: {
          Monitoring: {
            Enabled: true,
          },
        },
      },
    });
  });

  it("set defaultInstanceWarmup on the ASG when set", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      monitoringConfiguration: { noMonitoring: true },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
        defaultInstanceWarmup: Duration.minutes(2),
      },
    });
    Template.fromStack(stack).hasResource("AWS::AutoScaling::AutoScalingGroup", {
      Properties: {
        DefaultInstanceWarmup: 120,
      },
    });
  });

  it("creates a WAF param when set", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      monitoringConfiguration: { noMonitoring: true },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
        defaultInstanceWarmup: Duration.minutes(2),
      },
      waf: { enabled: true },
    });
    Template.fromStack(stack).hasResource("AWS::SSM::Parameter", {
      Properties: {
        Name: `/infosec/waf/services/TEST/test-gu-ec2-app-alb-arn`,
        Description: `The ARN of the ALB for TEST-test-gu-ec2-app.`,
        Value: { Ref: "LoadBalancerTestguec2appC77A055C" },
        Tier: "Standard",
        DataType: "text",
      },
    });
  });

  it("creates a WAF param with a specific logical id when set and overridden", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      monitoringConfiguration: { noMonitoring: true },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
        defaultInstanceWarmup: Duration.minutes(2),
      },
      waf: { enabled: true },
    });

    stack.overrideLogicalId(app.loadBalancer.waf!, {
      logicalId: "ssm param escape hatch",
      reason: "Retaining original parameter's logical ID to avoid deployment issues",
    });

    const resourceId = Template.fromStack(stack).getResourceId("AWS::SSM::Parameter", {
      Properties: {
        Name: `/infosec/waf/services/TEST/test-gu-ec2-app-alb-arn`,
      },
    });

    expect(resourceId).toBe("ssm param escape hatch");
  });
});

describe("the GuLoadBalancedAppExperimental pattern should support experimental EC2 versioned deployment functionality", function () {
  it("should produce the correct snapshot if versioned updates are enabled", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu";
    const buildIdentifier = "123";
    new GuLoadBalancedAppExperimental(stack, {
      applicationPort: 3000,
      app,
      access: { scope: AccessScope.PUBLIC },
      monitoringConfiguration: { noMonitoring: true },
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: {
          distributable: {
            fileName: `${app}-${buildIdentifier}.deb`,
            executionStatement: `dpkg -i /${app}/${app}-${buildIdentifier}.deb`,
          },
        },
        scaling: {
          minimumInstances: 1,
        },
        versionedDeployments: {
          enabled: true,
          buildIdentifier,
        },
      },
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
  it("should throw an error if the user passes an updatePolicy whilst using versioned deployments", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    expect(
      () =>
        new GuLoadBalancedAppExperimental(stack, {
          ...topLevelPropsForVersionedDeployment(),
          ec2Props: { updatePolicy: UpdatePolicy.replacingUpdate(), ...ec2PropsForVersionedDeployment(stack) },
        }),
    ).toThrow("If versionedDeployments are enabled then updatePolicy should not be set via ec2Props");
  });
  it("should create an ASG with min, max, and desired capacity set", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });

    new GuLoadBalancedAppExperimental(stack, {
      ...topLevelPropsForVersionedDeployment(),
      ec2Props: { ...ec2PropsForVersionedDeployment(stack), scaling: { minimumInstances: 5 } },
    });

    Template.fromStack(stack).hasResource("AWS::AutoScaling::AutoScalingGroup", {
      Properties: {
        MinSize: "5",
        MaxSize: "10",
        DesiredCapacity: "5",
      },
    });
  });

  it("should create an ASG with a resource signal count that matches the min instances", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });

    new GuLoadBalancedAppExperimental(stack, {
      ...topLevelPropsForVersionedDeployment(),
      ec2Props: { ...ec2PropsForVersionedDeployment(stack), scaling: { minimumInstances: 5 } },
    });

    Template.fromStack(stack).hasResource("AWS::AutoScaling::AutoScalingGroup", {
      Properties: {
        MinSize: "5",
      },
      CreationPolicy: {
        ResourceSignal: {
          Count: 5,
        },
      },
    });
  });

  it("should have a PauseTime higher than the ASG healthcheck grace period", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const { autoScalingGroup } = new GuLoadBalancedAppExperimental(stack, {
      ...topLevelPropsForVersionedDeployment(),
      ec2Props: { ...ec2PropsForVersionedDeployment(stack) },
    });

    const tenMinutes = Duration.minutes(10);
    const tenMinutesPlusBuffer = tenMinutes.plus(RollingUpdateDurations.buffer);

    const cfnAsg = autoScalingGroup!.node.defaultChild as CfnAutoScalingGroup;
    cfnAsg.healthCheckGracePeriod = tenMinutes.toSeconds();

    const template = getTemplateAfterAspectInvocation(stack);

    template.hasResource("AWS::AutoScaling::AutoScalingGroup", {
      Properties: {
        HealthCheckGracePeriod: tenMinutes.toSeconds(),
      },
      CreationPolicy: {
        ResourceSignal: {
          Timeout: tenMinutesPlusBuffer.toIsoString(),
        },
      },
      UpdatePolicy: {
        AutoScalingRollingUpdate: {
          PauseTime: tenMinutesPlusBuffer.toIsoString(),
        },
      },
    });
  });

  it("should add to the end of the user data", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });

    const userDataCommand = `echo "Hello there"`;
    const userData = UserData.forLinux();
    userData.addCommands(userDataCommand);

    const { autoScalingGroup } = new GuLoadBalancedAppExperimental(stack, {
      ...topLevelPropsForVersionedDeployment(),
      ec2Props: { ...ec2PropsForVersionedDeployment(stack), userData },
    });

    const renderedUserData = autoScalingGroup!.userData.render();
    const splitUserData = renderedUserData.split("\n");
    const totalLines = splitUserData.length;

    const appCommandPosition = splitUserData.indexOf(userDataCommand);
    const startMarkerPosition = splitUserData.indexOf("# GuEc2AppExperimental Instance Health Check Start");
    const endMarkerPosition = splitUserData.indexOf("# GuEc2AppExperimental Instance Health Check End");

    // Application user data should be before the target group healthcheck polling.
    expect(appCommandPosition).toBeLessThan(startMarkerPosition);

    // The target group healthcheck polling should be the last thing in the user data.
    expect(endMarkerPosition).toEqual(totalLines - 1);
  });

  it("should only adjust properties of a horizontally scaling service", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });

    const scalingApp = "my-scaling-app";
    const { autoScalingGroup } = new GuLoadBalancedAppExperimental(stack, {
      ...topLevelPropsForVersionedDeployment(scalingApp),
      ec2Props: { ...ec2PropsForVersionedDeployment(stack, scalingApp), scaling: { minimumInstances: 5 } },
    });
    autoScalingGroup!.scaleOnRequestCount("ScaleOnRequests", {
      targetRequestsPerMinute: 100,
    });

    const staticApp = "my-static-app";
    new GuLoadBalancedAppExperimental(stack, {
      ...topLevelPropsForVersionedDeployment(staticApp),
      ec2Props: { ...ec2PropsForVersionedDeployment(stack, staticApp) },
    });

    const template = getTemplateAfterAspectInvocation(stack);

    // The scaling ASG should NOT have `DesiredCapacity` set, and `MinInstancesInService` set via a CFN Parameter
    const parameterName = "MinInstancesInServiceFormyscalingapp";
    template.hasParameter(parameterName, {
      Type: "Number",
    });
    template.hasResource("AWS::AutoScaling::AutoScalingGroup", {
      Properties: {
        DesiredCapacity: Match.absent(),
        Tags: Match.arrayWith([{ Key: "App", Value: scalingApp, PropagateAtLaunch: true }]),
      },
      UpdatePolicy: {
        AutoScalingRollingUpdate: {
          MinInstancesInService: {
            Ref: parameterName,
          },
        },
      },
    });

    // The static ASG SHOULD have `DesiredCapacity` and `MinInstancesInService` explicitly
    template.hasResource("AWS::AutoScaling::AutoScalingGroup", {
      Properties: {
        DesiredCapacity: "1",
        Tags: Match.arrayWith([{ Key: "App", Value: staticApp, PropagateAtLaunch: true }]),
      },
      UpdatePolicy: {
        AutoScalingRollingUpdate: {
          MinInstancesInService: 1,
        },
      },
    });
  });

  it("should add a single CFN Parameter per ASG regardless of how many scaling policies are attached to it", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });

    const scalingApp = "my-scaling-app";
    const { autoScalingGroup } = new GuLoadBalancedAppExperimental(stack, {
      ...topLevelPropsForVersionedDeployment(scalingApp),
      ec2Props: { ...ec2PropsForVersionedDeployment(stack, scalingApp), scaling: { minimumInstances: 5 } },
    });
    autoScalingGroup!.scaleOnRequestCount("ScaleOnRequests", {
      targetRequestsPerMinute: 100,
    });

    new CfnScalingPolicy(autoScalingGroup!, "ScaleOut", {
      autoScalingGroupName: autoScalingGroup!.autoScalingGroupName,
      policyType: "SimpleScaling",
      adjustmentType: "ChangeInCapacity",
      scalingAdjustment: 1,
    });

    new CfnScalingPolicy(autoScalingGroup!, "ScaleIn", {
      autoScalingGroupName: autoScalingGroup!.autoScalingGroupName,
      policyType: "SimpleScaling",
      adjustmentType: "ChangeInCapacity",
      scalingAdjustment: -1,
    });

    const template = getTemplateAfterAspectInvocation(stack);

    const parameterName = `MinInstancesInServiceFor${scalingApp.replaceAll("-", "")}`;

    template.hasParameter(parameterName, {
      Type: "Number",
    });

    template.resourceCountIs("AWS::AutoScaling::AutoScalingGroup", 1);
    template.hasResource("AWS::AutoScaling::AutoScalingGroup", {
      UpdatePolicy: {
        AutoScalingRollingUpdate: {
          MinInstancesInService: {
            Ref: parameterName,
          },
        },
      },
    });

    template.resourceCountIs("AWS::AutoScaling::ScalingPolicy", 3);
  });

  it("should throw an error when a scaling policy is not created with a GuAutoScalingGroup scope", () => {
    const cdkApp = new App();
    const stack = new GuStack(cdkApp, "test", {
      stack: "test-stack",
      stage: "TEST",
      env: { region: "eu-west-1" },
    });

    const { autoScalingGroup } = new GuLoadBalancedAppExperimental(stack, {
      ...topLevelPropsForVersionedDeployment(),
      ec2Props: { ...ec2PropsForVersionedDeployment(stack) },
    });

    /**
     * Should be created like this to avoid the error:
     *
     * @example
     * ```ts
     * declare const autoScalingGroup: GuAutoScalingGroup;
     * new CfnScalingPolicy(autoScalingGroup, "ScaleOut", { ... });
     * ```
     */
    new CfnScalingPolicy(stack, "ScaleOut", {
      autoScalingGroupName: autoScalingGroup!.autoScalingGroupName,
      policyType: "SimpleScaling",
      adjustmentType: "ChangeInCapacity",
      scalingAdjustment: 1,
    });

    expect(() => {
      cdkApp.synth();
    }).toThrow(
      "Failed to detect the autoscaling group relating to the scaling policy on path test/ScaleOut. Was it created in the scope of a GuAutoScalingGroup?",
    );
  });

  it("should add the correct CFN Parameters for more than one EC2 app in the same stack", () => {
    const app = new App();
    const stack = new GuStack(app, "test", {
      stack: "test-stack",
      stage: "TEST",
      env: { region: "eu-west-1" },
    });

    const appA = new GuLoadBalancedAppExperimental(stack, {
      ...topLevelPropsForVersionedDeployment("app-a"),
      ec2Props: {
        ...ec2PropsForVersionedDeployment(stack, "app-a"),
        scaling: { minimumInstances: 3, maximumInstances: 12 },
      },
    });
    appA.autoScalingGroup!.scaleOnRequestCount("ScaleOnRequests", {
      targetRequestsPerMinute: 99,
    });

    const appB = new GuLoadBalancedAppExperimental(stack, {
      ...topLevelPropsForVersionedDeployment("app-b"),
      ec2Props: {
        ...ec2PropsForVersionedDeployment(stack, "app-b"),
        scaling: { minimumInstances: 6, maximumInstances: 24 },
      },
    });
    appB.autoScalingGroup!.scaleOnRequestCount("ScaleOnRequests", {
      targetRequestsPerMinute: 100,
    });

    const template = getTemplateAfterAspectInvocation(stack);

    template.hasParameter("MinInstancesInServiceForappa", {
      Type: "Number",
    });

    template.hasParameter("MinInstancesInServiceForappb", {
      Type: "Number",
    });
  });

  it("should add the correct CFN Parameters for two separate stacks in the same app", () => {
    const app = new App();

    interface MicroserviceProps extends GuStackProps {
      scaling: GuAsgCapacity;
    }

    class Microservice extends GuStack {
      // eslint-disable-next-line custom-rules/valid-constructors -- this is a test
      constructor(scope: App, id: string, props: MicroserviceProps) {
        super(scope, id, {
          ...props,
        });
        const ec2App = new GuLoadBalancedAppExperimental(this, {
          ...topLevelPropsForVersionedDeployment(),
          ec2Props: { ...ec2PropsForVersionedDeployment(this), scaling: props.scaling },
        });
        ec2App.autoScalingGroup!.scaleOnRequestCount("ScaleOnRequests", {
          targetRequestsPerMinute: 100,
        });
      }
    }

    const codeStack = new Microservice(app, "CODE", {
      stack: "playground",
      stage: "CODE",
      scaling: { minimumInstances: 1, maximumInstances: 2 },
      env: { region: "eu-west-1" },
    });
    const prodStack = new Microservice(app, "PROD", {
      stack: "playground",
      stage: "PROD",
      scaling: { minimumInstances: 3, maximumInstances: 12 },
      env: { region: "eu-west-1" },
    });

    const codeTemplate = getTemplateAfterAspectInvocation(codeStack);
    const prodTemplate = getTemplateAfterAspectInvocation(prodStack);

    const parameterName = "MinInstancesInServiceFortestguec2app";

    codeTemplate.hasParameter(parameterName, {
      Type: "Number",
    });

    prodTemplate.hasParameter(parameterName, {
      Type: "Number",
    });
  });

  it("should only add the relevant CFN Parameters for different services which share the same App", () => {
    const app = new App();

    interface MicroserviceProps extends GuStackProps {
      appName: string;
    }

    class Microservice extends GuStack {
      // eslint-disable-next-line custom-rules/valid-constructors -- this is a test
      constructor(scope: App, id: string, props: MicroserviceProps) {
        super(scope, id, {
          ...props,
        });
        const ec2App = new GuLoadBalancedAppExperimental(this, {
          ...topLevelPropsForVersionedDeployment(props.appName),
          ec2Props: { ...ec2PropsForVersionedDeployment(this, props.appName) },
        });
        ec2App.autoScalingGroup!.scaleOnRequestCount("ScaleOnRequests", {
          targetRequestsPerMinute: 100,
        });
      }
    }

    const appA = new Microservice(app, "app-a-PROD", {
      stack: "playground",
      stage: "PROD",
      appName: "app-a",
      env: { region: "eu-west-1" },
    });
    const appB = new Microservice(app, "app-b-PROD", {
      stack: "playground",
      stage: "PROD",
      appName: "app-b",
      env: { region: "eu-west-1" },
    });

    const templateA = getTemplateAfterAspectInvocation(appA);
    const templateB = getTemplateAfterAspectInvocation(appB);

    templateA.hasParameter("MinInstancesInServiceForappa", {
      Type: "Number",
    });

    expect(templateA.findParameters("*")["MinInstancesInServiceForappb"]).toEqual(undefined);

    templateB.hasParameter("MinInstancesInServiceForappb", {
      Type: "Number",
    });

    expect(templateB.findParameters("*")["MinInstancesInServiceForappa"]).toEqual(undefined);
  });

  it("should add the correct target group attributes if slow start is enabled", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      ...topLevelPropsForVersionedDeployment(),
      ec2Props: {
        ...ec2PropsForVersionedDeployment(stack),
        versionedDeployments: { enabled: true, buildIdentifier: "123", slowStartDuration: Duration.seconds(44) },
      },
    });
    const template = getTemplateAfterAspectInvocation(stack);
    template.hasResource("AWS::ElasticLoadBalancingV2::TargetGroup", {
      Properties: {
        TargetGroupAttributes: Match.arrayWith([
          { Key: "deregistration_delay.timeout_seconds", Value: "30" },
          { Key: "stickiness.enabled", Value: "false" },
          { Key: "slow_start.duration_seconds", Value: "44" },
        ]),
      },
    });
  });

  it("should update the pause time for the rolling update correctly", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      ...topLevelPropsForVersionedDeployment(),
      ec2Props: {
        ...ec2PropsForVersionedDeployment(stack),
        versionedDeployments: { enabled: true, buildIdentifier: "123", slowStartDuration: Duration.minutes(1) },
      },
    });
    const template = getTemplateAfterAspectInvocation(stack);
    template.hasResource("AWS::AutoScaling::AutoScalingGroup", {
      UpdatePolicy: {
        AutoScalingRollingUpdate: {
          PauseTime: "PT4M",
        },
      },
    });
  });

  it("should update the script correctly if slow start is enabled", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const userDataCommand = `echo "Hello there"`;
    const userData = UserData.forLinux();
    userData.addCommands(userDataCommand);

    const { autoScalingGroup } = new GuLoadBalancedAppExperimental(stack, {
      ...topLevelPropsForVersionedDeployment(),
      ec2Props: {
        ...ec2PropsForVersionedDeployment(stack),
        versionedDeployments: { enabled: true, buildIdentifier: "123", slowStartDuration: Duration.seconds(30) },
      },
    });

    const renderedUserData = autoScalingGroup!.userData.render();
    const splitUserData = renderedUserData.split("\n");
    const totalLines = splitUserData.length;

    const healthCheckMarkerEnd = splitUserData.indexOf("# GuEc2AppExperimental Instance Health Check End");
    const slowStartMarkerStart = splitUserData.indexOf("# GuEc2AppExperimental SlowStart Wait Period Start");
    const slowStartMarkerEnd = splitUserData.indexOf("# GuEc2AppExperimental SlowStart Wait Period End");

    // Health check polling should end just before the slow start pause kicks in
    expect(healthCheckMarkerEnd).toEqual(slowStartMarkerStart - 1);

    // If slow start is enabled, the logic related to this should be the last thing in the user data script.
    expect(slowStartMarkerEnd).toEqual(totalLines - 1);
  });

  it("should throw an error if the slow start value is too low", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    expect(() => {
      new GuLoadBalancedAppExperimental(stack, {
        ...topLevelPropsForVersionedDeployment(),
        ec2Props: {
          ...ec2PropsForVersionedDeployment(stack),
          versionedDeployments: { enabled: true, buildIdentifier: "123", slowStartDuration: Duration.seconds(29) },
        },
      });
    }).toThrow("Slow start duration must be between 30 and 900 seconds");
  });

  it("should throw an error if the slow start value is too high", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    expect(() => {
      new GuLoadBalancedAppExperimental(stack, {
        ...topLevelPropsForVersionedDeployment(),
        ec2Props: {
          ...ec2PropsForVersionedDeployment(stack),
          versionedDeployments: { enabled: true, buildIdentifier: "123", slowStartDuration: Duration.seconds(901) },
        },
      });
    }).toThrow("Slow start duration must be between 30 and 900 seconds");
  });
});

function topLevelPropsForVersionedDeployment(app = "test-gu-ec2-app") {
  return {
    applicationPort: 9000,
    app,
    access: { scope: AccessScope.PUBLIC } as AppAccess,
    monitoringConfiguration: { noMonitoring: true } as NoMonitoring,
    certificateProps: {
      domainName: "domain-name-for-your-application.example",
    },
  };
}

function ec2PropsForVersionedDeployment(scope: GuStack, app = "test-gu-ec2-app") {
  const buildNumber = 123;
  const { userData } = new GuUserData(scope, {
    app,
    distributable: {
      fileName: `${app}-${buildNumber}.deb`,
      executionStatement: `dpkg -i /${app}/${app}-${buildNumber}.deb`,
    },
  });

  return {
    instanceMetricGranularity: "5Minute" as "1Minute" | "5Minute",
    instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
    userData,
    scaling: {
      minimumInstances: 1,
    },
    versionedDeployments: {
      enabled: true,
      buildIdentifier: "123",
    },
  };
}
