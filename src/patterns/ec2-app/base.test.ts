import { Duration } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { BlockDeviceVolume, EbsDeviceVolumeType, UpdatePolicy } from "aws-cdk-lib/aws-autoscaling";
import { InstanceClass, InstanceSize, InstanceType, Peer, Port, UserData, Vpc } from "aws-cdk-lib/aws-ec2";
import { type CfnLoadBalancer } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { AccessScope, MetadataKeys } from "../../constants";
import { GuPrivateConfigBucketParameter } from "../../constructs/core";
import { GuSecurityGroup } from "../../constructs/ec2";
import { GuDynamoDBWritePolicy } from "../../constructs/iam";
import { GuTemplate, simpleGuStackForTesting } from "../../utils/test";
import { GuEc2App } from "./base";

describe("the GuEC2App pattern", function () {
  it("should produce a functional EC2 app with minimal arguments", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuEc2App(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("can produce a restricted EC2 app locked to specific CIDR ranges", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuEc2App(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.RESTRICTED, cidrRanges: [Peer.ipv4("1.2.3.4/5")] },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("can produce an EC2 app with an internal load balancer (located in private subnets)", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuEc2App(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.INTERNAL, cidrRanges: [Peer.ipv4("10.0.0.0/8")] },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
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
    new GuEc2App(stack, {
      applicationPort: 3000,
      app,
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      monitoringConfiguration: { noMonitoring: true },
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
    new GuEc2App(stack, {
      applicationPort: 3000,
      app,
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      monitoringConfiguration: {
        snsTopicName: "test-topic",
        // Note: http4xxAlarm is not a required parameter
        http5xxAlarm: {
          tolerated5xxPercentage: 5,
        },
        unhealthyInstancesAlarm: false,
      },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
    });
    //The shape of this alarm is tested at construct level
    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::CloudWatch::Alarm", /^High5xxPercentageAlarm.+/);
  });

  it("creates a High4xxPercentageAlarm if the relevant monitoringConfiguration is provided", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: 3000,
      app,
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      monitoringConfiguration: {
        snsTopicName: "test-topic",
        http5xxAlarm: false,
        http4xxAlarm: {
          tolerated4xxPercentage: 5,
        },
        unhealthyInstancesAlarm: false,
      },
      userData: UserData.forLinux(),
      instanceMetricGranularity: "5Minute",
    });
    //The shape of this alarm is tested at construct level
    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::CloudWatch::Alarm", /^High4xxPercentageAlarm.+/);
  });

  it("creates an UnhealthyInstancesAlarm if the user enables it", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: 3000,
      app,
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      monitoringConfiguration: {
        snsTopicName: "test-topic",
        http5xxAlarm: false,
        unhealthyInstancesAlarm: true,
      },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
    });
    //The shape of this alarm is tested at construct level
    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::CloudWatch::Alarm", /^UnhealthyInstancesAlarm.+/);
  });

  it("Skips alarm creation if the user explicitly opts-out", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: 3000,
      app,
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      monitoringConfiguration: {
        snsTopicName: "test-topic",
        http5xxAlarm: false,
        unhealthyInstancesAlarm: false,
      },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
    });
    Template.fromStack(stack).resourceCountIs("AWS::CloudWatch::Alarm", 0);
  });

  it("creates the appropriate ingress rules for a restricted access application", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: 3000,
      app: app,
      access: { scope: AccessScope.RESTRICTED, cidrRanges: [Peer.ipv4("192.168.1.1/32"), Peer.ipv4("8.8.8.8/32")] },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
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
    new GuEc2App(stack, {
      applicationPort: 3000,
      app: app,
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
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
        new GuEc2App(stack, {
          applicationPort: 3000,
          access: { scope: AccessScope.RESTRICTED, cidrRanges: [Peer.ipv4("0.0.0.0/0"), Peer.ipv4("1.2.3.4/32")] },
          app: app,
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
          certificateProps: {
            domainName: "domain-name-for-your-application.example",
          },
          scaling: {
            minimumInstances: 1,
          },
          monitoringConfiguration: { noMonitoring: true },
          instanceMetricGranularity: "5Minute",
          userData: UserData.forLinux(),
        }),
    ).toThrowError(
      "Restricted apps cannot be globally accessible. Adjust CIDR ranges (0.0.0.0/0, 1.2.3.4/32) or use Public.",
    );
  });

  it("errors if specifying public CIDR ranges with internal access scope", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    expect(
      () =>
        new GuEc2App(stack, {
          applicationPort: 3000,
          access: { scope: AccessScope.INTERNAL, cidrRanges: [Peer.ipv4("93.1.2.3/12")] },
          app: app,
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
          certificateProps: {
            domainName: "domain-name-for-your-application.example",
          },
          scaling: {
            minimumInstances: 1,
          },
          monitoringConfiguration: { noMonitoring: true },
          instanceMetricGranularity: "5Minute",
          userData: UserData.forLinux(),
        }),
    ).toThrowError(
      "Internal apps should only be accessible on 10. ranges. Adjust CIDR ranges (93.1.2.3/12) or use Restricted.",
    );
  });

  it("correctly wires up custom role configuration", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: 3000,
      access: { scope: AccessScope.PUBLIC },
      app: app,
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      roleConfiguration: {
        withoutLogShipping: true,
        additionalPolicies: [new GuDynamoDBWritePolicy(stack, "DynamoTable", { tableName: "my-dynamo-table" })],
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
    const pattern = new GuEc2App(stack, {
      applicationPort: 3000,
      app: app,
      access: { scope: AccessScope.RESTRICTED, cidrRanges: [] },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux({ shebang: "#!/user/data/from/pattern" }),
    });

    expect(pattern.autoScalingGroup.userData.render()).toEqual(`#!/user/data/from/pattern`);

    pattern.autoScalingGroup.addUserData("UserData from accessed construct");

    expect(pattern.autoScalingGroup.userData.render()).toEqual(`#!/user/data/from/pattern
UserData from accessed construct`);
  });

  it("users can optionally configure block devices", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: 3000,
      app: app,
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      blockDevices: [
        {
          deviceName: "/dev/sda1",
          volume: BlockDeviceVolume.ebs(8, {
            volumeType: EbsDeviceVolumeType.GP2,
          }),
        },
      ],
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
    const pattern = new GuEc2App(stack, {
      applicationPort: 3000,
      app,
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
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
    new GuEc2App(stack, {
      applicationPort: 3000,
      app: "NodeApp",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "node-app.code.example.com",
      },
      scaling: {
        minimumInstances: 1,
      },
    });

    new GuEc2App(stack, {
      applicationPort: 9000,
      app: "PlayApp",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "play-app.code.example.com",
      },
      scaling: {
        minimumInstances: 3,
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
      new GuEc2App(stack, {
        applicationPort: 3000,
        access: { scope: AccessScope.PUBLIC },
        app,
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        certificateProps: {
          domainName: "domain-name-for-your-application.example",
        },
        scaling: {
          minimumInstances: 1,
        },
        monitoringConfiguration: { noMonitoring: true },
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
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
      new GuEc2App(stack, {
        applicationPort: 3000,
        access: { scope: AccessScope.PUBLIC },
        app,
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        certificateProps: {
          domainName: "domain-name-for-your-application.example",
        },
        scaling: {
          minimumInstances: 1,
        },
        monitoringConfiguration: { noMonitoring: true },
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        withAccessLogging: false,
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

      new GuEc2App(stack, {
        applicationPort: 3000,
        app: "test-gu-ec2-app-1",
        access: { scope: AccessScope.PUBLIC },
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        monitoringConfiguration: { noMonitoring: true },
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        certificateProps: {
          domainName: "domain-name-for-your-application.example",
        },
        scaling: {
          minimumInstances: 1,
        },
        instanceMetadataHopLimit: 2,
      });

      new GuEc2App(stack, {
        applicationPort: 3000,
        app: "test-gu-ec2-app-2",
        access: { scope: AccessScope.PUBLIC },
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        monitoringConfiguration: { noMonitoring: true },
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        certificateProps: {
          domainName: "domain-name-for-your-application.example",
        },
        scaling: {
          minimumInstances: 1,
        },
        instanceMetadataHopLimit: 2,
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
    new GuEc2App(stack, {
      applicationPort: 3000,
      access: { scope: AccessScope.PUBLIC },
      app,
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      applicationLogging: { enabled: true },
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
    new GuEc2App(stack, {
      applicationPort: 3000,
      access: { scope: AccessScope.PUBLIC },
      app,
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      applicationLogging: { enabled: true, systemdUnitName: "not-my-app-name" },
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
      new GuEc2App(stack, {
        applicationPort: 3000,
        access: { scope: AccessScope.PUBLIC },
        app,
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        certificateProps: {
          domainName: "domain-name-for-your-application.example",
        },
        scaling: {
          minimumInstances: 1,
        },
        monitoringConfiguration: { noMonitoring: true },
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        applicationLogging: { enabled: true },
        roleConfiguration: {
          withoutLogShipping: true,
        },
      });
    }).toThrowError(
      "Application logging has been enabled (via the `applicationLogging` prop) but your `roleConfiguration` sets " +
        "`withoutLogShipping` to true. Please turn off application logging or remove `withoutLogShipping`",
    );
  });

  it("adds a tag to aid visibility of stacks using the pattern", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "App";
    new GuEc2App(stack, {
      applicationPort: 3000,
      access: { scope: AccessScope.PUBLIC },
      app,
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
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

    new GuEc2App(stack, {
      applicationPort: 3000,
      access: { scope: AccessScope.PUBLIC },
      app,
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: {
        domainName: domain,
      },
      scaling: {
        minimumInstances: 1,
      },
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      googleAuth: {
        enabled: true,
        domain,
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
        new GuEc2App(stack, {
          applicationPort: 3000,
          access: { scope: AccessScope.PUBLIC },
          app,
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
          certificateProps: {
            domainName: domain,
          },
          scaling: {
            minimumInstances: 1,
          },
          monitoringConfiguration: { noMonitoring: true },
          instanceMetricGranularity: "5Minute",
          userData: UserData.forLinux(),
          googleAuth: {
            enabled: true,
            domain,
            allowedGroups: [],
          },
        }),
    ).toThrowError("googleAuth.allowedGroups cannot be empty!");
  });

  it("throws when googleAuth.sessionTimeoutInMinutes is > 60", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "app";
    const domain = "domain-name-for-your-application.example";

    expect(
      () =>
        new GuEc2App(stack, {
          applicationPort: 3000,
          access: { scope: AccessScope.PUBLIC },
          app,
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
          certificateProps: {
            domainName: domain,
          },
          scaling: {
            minimumInstances: 1,
          },
          monitoringConfiguration: { noMonitoring: true },
          instanceMetricGranularity: "5Minute",
          userData: UserData.forLinux(),
          googleAuth: {
            enabled: true,
            domain,
            sessionTimeoutInMinutes: 61,
          },
        }),
    ).toThrowError("googleAuth.sessionTimeoutInMinutes must be <= 60!");
  });

  it("throws when googleAuth.allowedGroups contains groups using non-standard domains", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "app";
    const domain = "domain-name-for-your-application.example";

    expect(
      () =>
        new GuEc2App(stack, {
          applicationPort: 3000,
          access: { scope: AccessScope.PUBLIC },
          app,
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
          certificateProps: {
            domainName: domain,
          },
          scaling: {
            minimumInstances: 1,
          },
          monitoringConfiguration: { noMonitoring: true },
          instanceMetricGranularity: "5Minute",
          userData: UserData.forLinux(),
          googleAuth: {
            enabled: true,
            domain,
            allowedGroups: ["apple@guardian.co.uk", "engineering@theguardian.com"],
          },
        }),
    ).toThrowError("googleAuth.allowedGroups must use the @guardian.co.uk domain.");
  });

  it("should provides a default healthcheck", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuEc2App(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
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
    new GuEc2App(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      healthcheck: {
        path: "/custom-healthcheck",
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
    new GuEc2App(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      instanceMetadataHopLimit: 2,
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
    new GuEc2App(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      instanceMetadataHopLimit: 2,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      SslPolicy: "ELBSecurityPolicy-TLS13-1-2-2021-06",
    });
  });

  it("has a defined UpdatePolicy when provided with one", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });

    new GuEc2App(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      instanceMetadataHopLimit: 2,
      updatePolicy: UpdatePolicy.replacingUpdate(),
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
    new GuEc2App(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "1Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
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
    new GuEc2App(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      defaultInstanceWarmup: Duration.minutes(2),
    });
    Template.fromStack(stack).hasResource("AWS::AutoScaling::AutoScalingGroup", {
      Properties: {
        DefaultInstanceWarmup: 120,
      },
    });
  });

  it("creates a WAF param when set", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuEc2App(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      defaultInstanceWarmup: Duration.minutes(2),
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
    const app = new GuEc2App(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      defaultInstanceWarmup: Duration.minutes(2),
      waf: { enabled: true },
    });

    stack.overrideLogicalId(app.loadBalancer.waf!, {
      logicalId: "ssm param escape hatch",
      reason: "Retaining original parameter's logical ID to avoid deployment issues",
    });

    const resourceId = Template.fromStack(stack).getResourceId("AWS::SSM::Parameter", {
      Properties: {
        Name: `/infosec/waf/services/TEST/test-gu-ec2-app-alb-arn`,
        Description: `The ARN of the ALB for TEST-test-gu-ec2-app.`,
        Value: { Ref: "LoadBalancerTestguec2appC77A055C" },
        Tier: "Standard",
        DataType: "text",
      },
    });

    expect(resourceId).toBe("ssm param escape hatch");
  });
});
