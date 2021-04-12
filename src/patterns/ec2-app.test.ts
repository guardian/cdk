import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { alphabeticalTags, simpleGuStackForTesting } from "../utils/test";
import { GuApplicationPorts, GuEc2App } from "./ec2-app";

describe("the GuEC2App pattern", function () {
  it("should produce a functional EC2 app with minimal arguments", function () {
    const stack = simpleGuStackForTesting();
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: "test-gu-ec2-app",
      publicFacing: false,
      userData: "#!/bin/dev foobarbaz",
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("can handle multiple EC2 apps in a single stack", function () {
    const stack = simpleGuStackForTesting();
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: "NodeApp",
      publicFacing: false,
      userData: "#!/bin/dev foobarbaz",
    });

    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Play,
      app: "PlayApp",
      publicFacing: false,
      userData: "#!/bin/dev foobarbaz",
    });

    expect(stack).toHaveResource("AWS::AutoScaling::AutoScalingGroup", {
      Tags: alphabeticalTags([
        {
          Key: "App",
          PropagateAtLaunch: true,
          Value: "PlayApp",
        },
        {
          Key: "gu:cdk:version",
          PropagateAtLaunch: true,
          Value: "TEST",
        },
        {
          Key: "Name",
          PropagateAtLaunch: true,
          Value: "Test/PlayAppAutoScalingGroupPlayApp",
        },
        {
          Key: "Stack",
          PropagateAtLaunch: true,
          Value: "test-stack",
        },
        {
          Key: "Stage",
          PropagateAtLaunch: true,
          Value: {
            Ref: "Stage",
          },
        },
      ]),
    });

    expect(stack).toHaveResource("AWS::AutoScaling::AutoScalingGroup", {
      Tags: alphabeticalTags([
        {
          Key: "App",
          PropagateAtLaunch: true,
          Value: "NodeApp",
        },
        {
          Key: "gu:cdk:version",
          PropagateAtLaunch: true,
          Value: "TEST",
        },
        {
          Key: "Name",
          PropagateAtLaunch: true,
          Value: "Test/NodeAppAutoScalingGroupNodeApp",
        },
        {
          Key: "Stack",
          PropagateAtLaunch: true,
          Value: "test-stack",
        },
        {
          Key: "Stage",
          PropagateAtLaunch: true,
          Value: {
            Ref: "Stage",
          },
        },
      ]),
    });
  });
});
