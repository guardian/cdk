import "../utils/test/jest";
import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Peer, Port, Vpc } from "@aws-cdk/aws-ec2";
import { Stage } from "../constants";
import { GuPrivateConfigBucketParameter } from "../constructs/core";
import { GuSecurityGroup } from "../constructs/ec2/security-groups";
import { GuDynamoDBWritePolicy } from "../constructs/iam";
import { simpleGuStackForTesting } from "../utils/test";
import { AccessScope, GuApplicationPorts, GuEc2App, GuNodeApp, GuPlayApp } from "./ec2-app";
import type { SynthedStack } from "../utils/test";
import type { CfnLoadBalancer } from "@aws-cdk/aws-elasticloadbalancingv2";

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

describe("the GuEC2App pattern", function () {
  it("should produce a functional EC2 app with minimal arguments", function () {
    const stack = simpleGuStackForTesting();
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
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
      monitoringConfiguration: { noMonitoring: true },
      userData: "#!/bin/dev foobarbaz",
      certificateProps: getCertificateProps(),
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("adds the correct permissions for apps which need to fetch private config from s3", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app,
      access: { scope: AccessScope.PUBLIC },
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

  it("creates an alarm if monitoringConfiguration is provided", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app,
      access: { scope: AccessScope.PUBLIC },
      certificateProps: getCertificateProps(),
      monitoringConfiguration: {
        tolerated5xxPercentage: 5,
        snsTopicName: "test-topic",
      },
      userData: "",
    });
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm"); //The shape of the alarm is tested at construct level
  });

  it("creates the appropriate ingress rules for a restricted access application", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: app,
      access: { scope: AccessScope.RESTRICTED, cidrRanges: [Peer.ipv4("192.168.1.1/32"), Peer.ipv4("8.8.8.8/32")] },
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

  it("users can override resources and constructs if desired", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    const pattern = new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app,
      access: { scope: AccessScope.PUBLIC },
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
      monitoringConfiguration: { noMonitoring: true },
      userData: "#!/bin/dev foobarbaz",
      certificateProps: getCertificateProps(),
    });

    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Play,
      app: "PlayApp",
      access: { scope: AccessScope.PUBLIC },
      monitoringConfiguration: { noMonitoring: true },
      userData: "#!/bin/dev foobarbaz",
      certificateProps: getCertificateProps(),
    });

    expect(stack).toHaveGuTaggedResource("AWS::AutoScaling::AutoScalingGroup", {
      appIdentity: { app: "PlayApp" },
      propagateAtLaunch: true,
      additionalTags: [{ Key: "Name", Value: "Test/AutoScalingGroupPlayApp" }],
    });

    expect(stack).toHaveGuTaggedResource("AWS::AutoScaling::AutoScalingGroup", {
      appIdentity: { app: "NodeApp" },
      propagateAtLaunch: true,
      additionalTags: [{ Key: "Name", Value: "Test/AutoScalingGroupNodeApp" }],
    });
  });

  describe("GuNodeApp", () => {
    it("should set the port to the default of 3000 if not specified", function () {
      const stack = simpleGuStackForTesting();
      new GuNodeApp(stack, {
        app: "NodeApp",
        access: { scope: AccessScope.PUBLIC },
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
