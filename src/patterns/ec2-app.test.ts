import { SynthUtils } from "@aws-cdk/assert";
import "@aws-cdk/assert/jest";
import { BlockDeviceVolume, EbsDeviceVolumeType } from "@aws-cdk/aws-autoscaling";
import { InstanceClass, InstanceSize, InstanceType, Peer, Port, Vpc } from "@aws-cdk/aws-ec2";
import type { CfnLoadBalancer } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Stage } from "../constants";
import { TagKeys } from "../constants/tag-keys";
import type { GuStack } from "../constructs/core";
import { GuPrivateConfigBucketParameter } from "../constructs/core";
import { GuSecurityGroup } from "../constructs/ec2/security-groups";
import { GuDynamoDBWritePolicy } from "../constructs/iam";
import type { SynthedStack } from "../utils/test";
import { simpleGuStackForTesting } from "../utils/test";
import "../utils/test/jest";
import type { GuEc2AppProps } from "./ec2-app";
import { AccessScope, GuApplicationPorts, GuEc2App, GuNodeApp, GuPlayApp } from "./ec2-app";

const getCertificateProps = () => ({
  [Stage.CODE]: {
    domainName: "code-guardian.com",
    hostedZoneId: "id123",
  },
  [Stage.PROD]: {
    domainName: "prod-guardian.com",
    hostedZoneId: "id124",
  },
});

function simpleEc2AppForTesting(stack: GuStack, app: string, props: Partial<GuEc2AppProps>) {
  return new GuEc2App(stack, {
    applicationPort: GuApplicationPorts.Node,
    app: app,
    access: { scope: AccessScope.PUBLIC },
    instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
    certificateProps: {
      [Stage.CODE]: { domainName: "code-guardian.com", hostedZoneId: "id123" },
      [Stage.PROD]: { domainName: "prod-guardian.com", hostedZoneId: "id124" },
    },
    monitoringConfiguration: { noMonitoring: true },
    userData: "UserData from pattern declaration",
    ...props,
  });
}

describe("the GuEC2App pattern", function () {
  it("should produce a functional EC2 app with minimal arguments", function () {
    const stack = simpleGuStackForTesting();
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      userData: "#!/bin/dev foobarbaz",
      certificateProps: getCertificateProps(),
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("can produce a restricted EC2 app locked to specific CIDR ranges", function () {
    const stack = simpleGuStackForTesting();
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.RESTRICTED, cidrRanges: [Peer.ipv4("1.2.3.4/5")] },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      userData: "#!/bin/dev foobarbaz",
      certificateProps: getCertificateProps(),
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("can produce an EC2 app with an internal load balancer (located in private subnets)", function () {
    const stack = simpleGuStackForTesting();
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.INTERNAL, cidrRanges: [Peer.ipv4("10.0.0.0/8")] },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      userData: "#!/bin/dev foobarbaz",
      certificateProps: getCertificateProps(),
    });
    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      Scheme: "internal",
      Subnets: {
        Ref: "testguec2appPrivateSubnets",
      },
    });
  });

  it("adds the correct permissions for apps which need to fetch private config from s3", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app,
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: getCertificateProps(),
      monitoringConfiguration: { noMonitoring: true },
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
    expect(stack).toHaveResource("AWS::IAM::Policy", {
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
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app,
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: getCertificateProps(),
      monitoringConfiguration: {
        snsTopicName: "test-topic",
        http5xxAlarm: {
          tolerated5xxPercentage: 5,
        },
        unhealthyInstancesAlarm: false,
      },
      userData: "",
    });
    //The shape of this alarm is tested at construct level
    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::CloudWatch::Alarm", /^High5xxPercentageAlarm.+/);
  });

  it("creates an UnhealthyInstancesAlarm if the user enables it", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app,
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: getCertificateProps(),
      monitoringConfiguration: {
        snsTopicName: "test-topic",
        http5xxAlarm: false,
        unhealthyInstancesAlarm: true,
      },
      userData: "",
    });
    //The shape of this alarm is tested at construct level
    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::CloudWatch::Alarm", /^UnhealthyInstancesAlarm.+/);
  });

  it("Skips alarm creation if the user explicitly opts-out", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app,
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: getCertificateProps(),
      monitoringConfiguration: {
        snsTopicName: "test-topic",
        http5xxAlarm: false,
        unhealthyInstancesAlarm: false,
      },
      userData: "",
    });
    expect(stack).not.toHaveResourceOfTypeAndLogicalId("AWS::CloudWatch::Alarm", /^High5xxPercentageAlarm.+/);
    expect(stack).not.toHaveResourceOfTypeAndLogicalId("AWS::CloudWatch::Alarm", /^UnhealthyInstancesAlarm.+/);
  });

  it("creates the appropriate ingress rules for a restricted access application", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: app,
      access: { scope: AccessScope.RESTRICTED, cidrRanges: [Peer.ipv4("192.168.1.1/32"), Peer.ipv4("8.8.8.8/32")] },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: getCertificateProps(),
      monitoringConfiguration: { noMonitoring: true },
      userData: "",
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    const securityGroupKey = Object.keys(json.Resources).filter((resource) =>
      // This will fail if we ever change the security group ID,
      //if there's a cleaner way of identifying the security group we should do it
      resource.toLowerCase().startsWith("restrictedingresssecuritygroup")
    )[0];
    const securityGroup = json.Resources[securityGroupKey];
    const loadBalancerKey = Object.keys(json.Resources).filter(
      (resource) => json.Resources[resource].Type === "AWS::ElasticLoadBalancingV2::LoadBalancer"
    )[0];
    const loadBalancer = json.Resources[loadBalancerKey];
    const lbSecurityGroups = loadBalancer.Properties.SecurityGroups as Array<{
      "Fn::GetAtt": [id: string, param: string];
    }>;
    const securityGroupIsAttachedToLoadBalancer = lbSecurityGroups.filter(
      (sg) => sg["Fn::GetAtt"][0] === securityGroupKey
    );

    // This asserts that the load balancer has the security group attached to it
    expect(securityGroupIsAttachedToLoadBalancer).toBeTruthy();

    // This asserts that said security group has the expected ingress rules
    expect(securityGroup.Properties).toEqual(
      expect.objectContaining({
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
      })
    );
  });

  it("allows all connections if set to public", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: app,
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: getCertificateProps(),
      monitoringConfiguration: { noMonitoring: true },
      userData: "",
    });

    expect(stack).toHaveResource("AWS::EC2::SecurityGroup", {
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
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    expect(
      () =>
        new GuEc2App(stack, {
          applicationPort: GuApplicationPorts.Node,
          access: { scope: AccessScope.RESTRICTED, cidrRanges: [Peer.ipv4("0.0.0.0/0"), Peer.ipv4("1.2.3.4/32")] },
          app: app,
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
          certificateProps: getCertificateProps(),
          monitoringConfiguration: { noMonitoring: true },
          userData: "",
        })
    ).toThrowError();
  });

  it("errors if specifying public CIDR ranges with internal access scope", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    expect(
      () =>
        new GuEc2App(stack, {
          applicationPort: GuApplicationPorts.Node,
          access: { scope: AccessScope.INTERNAL, cidrRanges: [Peer.ipv4("93.1.2.3/12")] },
          app: app,
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
          certificateProps: getCertificateProps(),
          monitoringConfiguration: { noMonitoring: true },
          userData: "",
        })
    ).toThrowError();
  });

  it("can configure ASG scaling by stage if desired", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      access: { scope: AccessScope.PUBLIC },
      app: app,
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: getCertificateProps(),
      monitoringConfiguration: { noMonitoring: true },
      userData: "",
      scaling: {
        CODE: { minimumInstances: 3 },
        PROD: { minimumInstances: 5, maximumInstances: 12 },
      },
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Mappings).toEqual({
      stagemapping: {
        CODE: expect.objectContaining({
          minInstances: 3,
          maxInstances: 6,
        }) as Record<string, number>,
        PROD: expect.objectContaining({
          minInstances: 5,
          maxInstances: 12,
        }) as Record<string, number>,
      },
    });
  });

  it("correctly wires up custom role configuration", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      access: { scope: AccessScope.PUBLIC },
      app: app,
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: getCertificateProps(),
      monitoringConfiguration: { noMonitoring: true },
      userData: "",
      roleConfiguration: {
        withoutLogShipping: true,
        additionalPolicies: [new GuDynamoDBWritePolicy(stack, "DynamoTable", { tableName: "my-dynamo-table" })],
      },
    });
    expect(stack).not.toHaveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: ["kinesis:Describe*", "kinesis:Put*"],
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:aws:kinesis:",
                  {
                    Ref: "AWS::Region",
                  },
                  ":",
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
      },
    });
    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: ["dynamodb:BatchWriteItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:UpdateItem"],
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:aws:dynamodb:",
                  {
                    Ref: "AWS::Region",
                  },
                  ":",
                  {
                    Ref: "AWS::AccountId",
                  },
                  ":table/my-dynamo-table",
                ],
              ],
            },
          },
        ],
      },
    });
  });

  it("sub-constructs can be accessed and modified after declaring the pattern", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    const pattern = new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: app,
      access: { scope: AccessScope.RESTRICTED, cidrRanges: [] },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: {
        [Stage.CODE]: { domainName: "code-guardian.com", hostedZoneId: "id123" },
        [Stage.PROD]: { domainName: "prod-guardian.com", hostedZoneId: "id124" },
      },
      monitoringConfiguration: { noMonitoring: true },
      userData: "UserData from pattern declaration",
    });

    expect(pattern.autoScalingGroup.userData).toEqual({ lines: ["UserData from pattern declaration"] });

    pattern.autoScalingGroup.addUserData("UserData from accessed construct");

    expect(pattern.autoScalingGroup.userData).toEqual({
      lines: ["UserData from pattern declaration", "UserData from accessed construct"],
    });
  });

  it("users can optionally configure block devices", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    simpleEc2AppForTesting(stack, app, {
      blockDevices: [
        {
          deviceName: "/dev/sda1",
          volume: BlockDeviceVolume.ebs(8, {
            volumeType: EbsDeviceVolumeType.GP2,
          }),
        },
      ],
    });

    expect(stack).toHaveResource("AWS::AutoScaling::LaunchConfiguration", {
      BlockDeviceMappings: [
        {
          DeviceName: "/dev/sda1",
          Ebs: {
            VolumeSize: 8,
            VolumeType: "gp2",
          },
        },
      ],
    });
  });

  it("users can override resources and constructs if desired", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    const pattern = new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app,
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: {
        [Stage.CODE]: { domainName: "code-guardian.com", hostedZoneId: "id123" },
        [Stage.PROD]: { domainName: "prod-guardian.com", hostedZoneId: "id124" },
      },
      monitoringConfiguration: { noMonitoring: true },
      userData: "UserData from pattern declaration",
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

    expect(stack).toHaveResource("AWS::EC2::SecurityGroup", {
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
    const stack = simpleGuStackForTesting();
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: "NodeApp",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      userData: "#!/bin/dev foobarbaz",
      certificateProps: {
        [Stage.CODE]: {
          domainName: "node-app.code.example.com",
        },
        [Stage.PROD]: {
          domainName: "node-app.example.com",
        },
      },
      scaling: {
        CODE: { minimumInstances: 0 },
        PROD: { minimumInstances: 1 },
      },
    });

    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Play,
      app: "PlayApp",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      userData: "#!/bin/dev foobarbaz",
      certificateProps: {
        [Stage.CODE]: {
          domainName: "play-app.code.example.com",
        },
        [Stage.PROD]: {
          domainName: "play-app.example.com",
        },
      },
      scaling: {
        CODE: { minimumInstances: 1 },
        PROD: { minimumInstances: 3 },
      },
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Mappings).toEqual({
      NodeApp: {
        CODE: {
          domainName: "node-app.code.example.com",
          minInstances: 0,
          maxInstances: 0,
        },
        PROD: {
          domainName: "node-app.example.com",
          minInstances: 1,
          maxInstances: 2,
        },
      },
      PlayApp: {
        CODE: {
          domainName: "play-app.code.example.com",
          minInstances: 1,
          maxInstances: 2,
        },
        PROD: {
          domainName: "play-app.example.com",
          minInstances: 3,
          maxInstances: 6,
        },
      },
    });

    expect(stack).toHaveGuTaggedResource("AWS::AutoScaling::AutoScalingGroup", {
      appIdentity: { app: "PlayApp" },
      propagateAtLaunch: true,
      additionalTags: [
        { Key: "Name", Value: "Test/AutoScalingGroupPlayApp" },
        { Key: TagKeys.PATTERN_NAME, Value: "GuEc2App" },
      ],
    });

    expect(stack).toHaveGuTaggedResource("AWS::AutoScaling::AutoScalingGroup", {
      appIdentity: { app: "NodeApp" },
      propagateAtLaunch: true,
      additionalTags: [
        { Key: "Name", Value: "Test/AutoScalingGroupNodeApp" },
        { Key: TagKeys.PATTERN_NAME, Value: "GuEc2App" },
      ],
    });
  });

  it("can be configured with access logging", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      access: { scope: AccessScope.PUBLIC },
      app,
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: getCertificateProps(),
      monitoringConfiguration: { noMonitoring: true },
      userData: "",
      accessLogging: { enabled: true, prefix: "access-logging-prefix" },
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      LoadBalancerAttributes: [
        { Key: "deletion_protection.enabled", Value: "true" },
        { Key: "access_logs.s3.enabled", Value: "true" },
        { Key: "access_logs.s3.bucket", Value: { Ref: "AccessLoggingBucket" } },
        { Key: "access_logs.s3.prefix", Value: "access-logging-prefix" },
      ],
    });
  });

  it("can disable access logging if desired", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      access: { scope: AccessScope.PUBLIC },
      app,
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: getCertificateProps(),
      monitoringConfiguration: { noMonitoring: true },
      userData: "",
      accessLogging: { enabled: false },
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    const lbKey = Object.keys(json.Resources).find(
      (resource) => json.Resources[resource].Type === "AWS::ElasticLoadBalancingV2::LoadBalancer"
    );
    expect(lbKey).toBeTruthy();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- We assert above that this is truthy
    const loadBalancer = json.Resources[lbKey!];

    expect(loadBalancer.Properties.LoadBalancerAttributes).toEqual(
      expect.not.arrayContaining([{ Key: "access_logs.s3.enabled", Value: "true" }])
    );
  });

  it("adds a tag to aid visibility of stacks using the pattern", () => {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "App";
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      access: { scope: AccessScope.PUBLIC },
      app,
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      certificateProps: getCertificateProps(),
      monitoringConfiguration: { noMonitoring: true },
      userData: "",
      accessLogging: { enabled: false },
    });

    expect(stack).toHaveGuTaggedResource("AWS::AutoScaling::AutoScalingGroup", {
      appIdentity: { app },
      propagateAtLaunch: true,
      additionalTags: [
        { Key: "Name", Value: "Test/AutoScalingGroupApp" },
        { Key: TagKeys.PATTERN_NAME, Value: "GuEc2App" },
      ],
    });
  });

  describe("GuNodeApp", () => {
    it("should set the port to the default of 3000 if not specified", function () {
      const stack = simpleGuStackForTesting();
      new GuNodeApp(stack, {
        app: "NodeApp",
        access: { scope: AccessScope.PUBLIC },
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        monitoringConfiguration: { noMonitoring: true },
        userData: "#!/bin/dev foobarbaz",
        certificateProps: {
          [Stage.CODE]: {
            domainName: "code-guardian.com",
            hostedZoneId: "id123",
          },
          [Stage.PROD]: {
            domainName: "prod-guardian.com",
            hostedZoneId: "id124",
          },
        },
      });

      expect(stack).toHaveResource("AWS::EC2::SecurityGroupIngress", {
        FromPort: 3000,
      });
    });
  });

  describe("GuPlayApp", () => {
    it("should set the port to the default of 9000 if not specified", function () {
      const stack = simpleGuStackForTesting();
      new GuPlayApp(stack, {
        app: "PlayApp",
        access: { scope: AccessScope.RESTRICTED, cidrRanges: [] },
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        monitoringConfiguration: { noMonitoring: true },
        userData: "#!/bin/dev foobarbaz",
        certificateProps: {
          [Stage.CODE]: {
            domainName: "code-guardian.com",
            hostedZoneId: "id123",
          },
          [Stage.PROD]: {
            domainName: "prod-guardian.com",
            hostedZoneId: "id124",
          },
        },
      });

      expect(stack).toHaveResource("AWS::EC2::SecurityGroupIngress", {
        FromPort: 9000,
      });
    });
  });
});
