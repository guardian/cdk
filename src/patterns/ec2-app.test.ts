import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { TrackingTag } from "../constants/library-info";
import { GuDistributionBucketParameter, GuPrivateConfigBucketParameter } from "../constructs/core";
import { alphabeticalTags, simpleGuStackForTesting } from "../utils/test";
import { GuApplicationPorts, GuEc2App, GuNodeApp, GuPlayApp } from "./ec2-app";

describe("the GuEC2App pattern", function () {
  it("should produce a functional EC2 app with minimal arguments", function () {
    const stack = simpleGuStackForTesting();
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: "test-gu-ec2-app",
      publicFacing: false,
      monitoringConfiguration: { noMonitoring: true },
      userData: "#!/bin/dev foobarbaz",
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("adds the correct permissions for apps which need to fetch private config from s3", function () {
    const stack = simpleGuStackForTesting();
    const app = "test-gu-ec2-app";
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: app,
      publicFacing: false,
      monitoringConfiguration: { noMonitoring: true },
      userData: {
        distributable: {
          bucket: GuDistributionBucketParameter.getInstance(stack),
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
      publicFacing: false,
      monitoringConfiguration: {
        tolerated5xxPercentage: 5,
        snsTopicName: "test-topic",
      },
      userData: "",
    });
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm"); //The shape of the alarm is tested at construct level
  });

  it("can handle multiple EC2 apps in a single stack", function () {
    const stack = simpleGuStackForTesting();
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: "NodeApp",
      publicFacing: false,
      monitoringConfiguration: { noMonitoring: true },
      userData: "#!/bin/dev foobarbaz",
    });

    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Play,
      app: "PlayApp",
      publicFacing: false,
      monitoringConfiguration: { noMonitoring: true },
      userData: "#!/bin/dev foobarbaz",
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
        publicFacing: false,
        monitoringConfiguration: { noMonitoring: true },
        userData: "#!/bin/dev foobarbaz",
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
        publicFacing: false,
        monitoringConfiguration: { noMonitoring: true },
        userData: "#!/bin/dev foobarbaz",
      });

      expect(stack).toHaveResource("AWS::EC2::SecurityGroupIngress", {
        FromPort: 9000,
      });
    });
  });
});
