import { Duration } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { BlockDeviceVolume, EbsDeviceVolumeType, UpdatePolicy } from "aws-cdk-lib/aws-autoscaling";
import { InstanceClass, InstanceSize, InstanceType, Peer, Port, UserData, Vpc } from "aws-cdk-lib/aws-ec2";
import type { CfnLoadBalancer } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { AccessScope, MetadataKeys } from "../../constants";
import { GuPrivateConfigBucketParameter } from "../../constructs/core";
import { GuSecurityGroup } from "../../constructs/ec2";
import { GuDynamoDBWritePolicy } from "../../constructs/iam";
import { GuTemplate, simpleGuStackForTesting } from "../../utils/test";
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
        repositoryName: "my-repository",
      },
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
  it("should be capable of splitting traffic between EC2 and ECS target groups", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
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
        repositoryName: "my-repository",
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
                TargetGroupArn: {
                  Ref: "TargetGroupTestgu1F401467",
                },
                Weight: 499,
              },
              {
                TargetGroupArn: {
                  Ref: "EcsTargetGroupTestguFCB7574C",
                },
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
            repositoryName: "my-repository",
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
            repositoryName: "my-repository",
          },
          targetGroupWeights: {
            ec2: 999,
            ecs: 1,
          },
        }),
    ).toThrow("Combined target group weights for EC2 and ECS must be equal to 999");
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

  it("allows a custom healthcheck", function () {
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
});
