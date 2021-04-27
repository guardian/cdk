import "../utils/test/jest";
import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Peer, Port, Vpc } from "@aws-cdk/aws-ec2";
import type { CfnLoadBalancer } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Stage } from "../constants";
import { TrackingTag } from "../constants/tracking-tag";
import { GuPrivateConfigBucketParameter } from "../constructs/core";
import { GuSecurityGroup } from "../constructs/ec2/security-groups";
import { alphabeticalTags, simpleGuStackForTesting } from "../utils/test";
import { GuApplicationPorts, GuEc2App, GuNodeApp, GuPlayApp } from "./ec2-app";

describe("the GuEC2App pattern", function () {
  it("should produce a functional EC2 app with minimal arguments", function () {
    const stack = simpleGuStackForTesting();
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: "test-gu-ec2-app",
      access: { type: "RESTRICTED", cidrRanges: ["192.168.1.1/32", "8.8.8.8/32"] },
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
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("adds the correct permissions for apps which need to fetch private config from s3", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: app,
      access: { type: "PUBLIC" },
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
      app: app,
      access: { type: "PUBLIC" },
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
      monitoringConfiguration: {
        tolerated5xxPercentage: 5,
        snsTopicName: "test-topic",
      },
      userData: "",
    });
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm"); //The shape of the alarm is tested at construct level
  });

  it("requires IP addresses to whitelist if set as a restricted access application", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: app,
      access: { type: "RESTRICTED", cidrRanges: ["192.168.1.1/32", "8.8.8.8/32"] },
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
      monitoringConfiguration: { noMonitoring: true },
      userData: "",
    });

    expect(stack).toHaveResource("AWS::ElasticLoadBalancing::LoadBalancer", {
      SecurityGroup: {},
    });
  });

  it("sub-constructs can be accessed and modified after declaring the pattern", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    const pattern = new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: app,
      publicFacing: false,
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
      app: app,
      publicFacing: true,
      certificateProps: {
        [Stage.CODE]: { domainName: "code-guardian.com", hostedZoneId: "id123" },
        [Stage.PROD]: { domainName: "prod-guardian.com", hostedZoneId: "id124" },
      },
      monitoringConfiguration: { noMonitoring: true },
      userData: "UserData from pattern declaration",
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
      access: { type: "PUBLIC" },
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

    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Play,
      app: "PlayApp",
      access: { type: "PUBLIC" },
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

    expect(stack).toHaveResource("AWS::AutoScaling::AutoScalingGroup", {
      Tags: alphabeticalTags([
        { Key: "App", PropagateAtLaunch: true, Value: "PlayApp" },
        { Key: "Name", PropagateAtLaunch: true, Value: "Test/AutoScalingGroupPlayApp" },
        { Key: "Stack", PropagateAtLaunch: true, Value: "test-stack" },
        { Key: "Stage", PropagateAtLaunch: true, Value: { Ref: "Stage" } },
        { ...TrackingTag, PropagateAtLaunch: true },
      ]),
    });

    expect(stack).toHaveResource("AWS::AutoScaling::AutoScalingGroup", {
      Tags: alphabeticalTags([
        { Key: "App", PropagateAtLaunch: true, Value: "NodeApp" },
        { Key: "Name", PropagateAtLaunch: true, Value: "Test/AutoScalingGroupNodeApp" },
        { Key: "Stack", PropagateAtLaunch: true, Value: "test-stack" },
        { Key: "Stage", PropagateAtLaunch: true, Value: { Ref: "Stage" } },
        { ...TrackingTag, PropagateAtLaunch: true },
      ]),
    });
  });

  describe("GuNodeApp", () => {
    it("should set the port to the default of 3000 if not specified", function () {
      const stack = simpleGuStackForTesting();
      new GuNodeApp(stack, {
        app: "NodeApp",
        access: { type: "PUBLIC" },
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
        access: { type: "INTERNAL" },
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
