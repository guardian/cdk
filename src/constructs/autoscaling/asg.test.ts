import "@aws-cdk/assert/jest";
import "../../utils/test/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import { InstanceType, UserData, Vpc } from "@aws-cdk/aws-ec2";
import { ApplicationProtocol } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Stack } from "@aws-cdk/core";
import { Stage } from "../../constants";
import { TrackingTag } from "../../constants/library-info";
import type { Resource, SynthedStack } from "../../utils/test";
import { alphabeticalTags, findResourceByTypeAndLogicalId, simpleGuStackForTesting } from "../../utils/test";
import { GuSecurityGroup } from "../ec2";
import { GuApplicationTargetGroup } from "../loadbalancing";
import type { GuAutoScalingGroupProps } from "./asg";
import { GuAutoScalingGroup } from "./";

describe("The GuAutoScalingGroup", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  const defaultProps: GuAutoScalingGroupProps = {
    vpc,
    userData: UserData.custom(["#!/bin/bash", "service some-dependency start", "service my-app start"].join("\n")),
    stageDependentProps: {
      [Stage.CODE]: {
        minimumInstances: 1,
      },
      [Stage.PROD]: {
        minimumInstances: 3,
      },
    },
    app: "testing",
  };

  test("Uses the AppIdentity to create the logicalId and tag the resource", () => {
    const stack = simpleGuStackForTesting();
    new GuAutoScalingGroup(stack, "MyAutoScalingGroup", defaultProps);

    expect(stack).toHaveResourceOfTypeAndLogicalId(
      "AWS::AutoScaling::AutoScalingGroup",
      /MyAutoScalingGroupTesting[A-Z0-9]+/
    );

    expect(stack).toHaveResource("AWS::AutoScaling::AutoScalingGroup", {
      Tags: alphabeticalTags([
        {
          Key: "App",
          PropagateAtLaunch: true,
          Value: "testing",
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
        {
          Key: "Name",
          PropagateAtLaunch: true,
          Value: "Test/MyAutoScalingGroupTesting",
        },
        { ...TrackingTag, PropagateAtLaunch: true },
      ]),
    });
  });

  test("adds the AMI parameter if no imageId prop provided", () => {
    const stack = simpleGuStackForTesting();

    new GuAutoScalingGroup(stack, "AutoscalingGroup", defaultProps);

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters["AMITesting"]).toEqual({
      Description:
        "Amazon Machine Image ID for the app testing. Use this in conjunction with AMIgo to keep AMIs up to date.",
      Type: "AWS::EC2::Image::Id",
    });

    expect(stack).toHaveResource("AWS::AutoScaling::LaunchConfiguration", {
      ImageId: {
        Ref: "AMITesting",
      },
    });
  });

  test("adds the instanceType parameter if none provided", () => {
    const stack = simpleGuStackForTesting();

    new GuAutoScalingGroup(stack, "AutoscalingGroup", defaultProps);

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters["InstanceTypeTesting"]).toEqual({
      Type: "String",
      Description: "EC2 Instance Type for the app testing",
      Default: "t3.small",
    });

    expect(stack).toHaveResource("AWS::AutoScaling::LaunchConfiguration", {
      InstanceType: {
        Ref: "InstanceTypeTesting",
      },
    });
  });

  test("does not create the instanceType parameter if value is provided", () => {
    const stack = simpleGuStackForTesting();

    new GuAutoScalingGroup(stack, "AutoscalingGroup", { ...defaultProps, instanceType: new InstanceType("t3.small") });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(Object.keys(json.Parameters)).not.toContain(InstanceType);

    expect(stack).toHaveResource("AWS::AutoScaling::LaunchConfiguration", {
      InstanceType: "t3.small",
    });
  });

  test("correctly sets the user data using prop", () => {
    const stack = simpleGuStackForTesting();

    new GuAutoScalingGroup(stack, "AutoscalingGroup", defaultProps);

    expect(stack).toHaveResource("AWS::AutoScaling::LaunchConfiguration", {
      UserData: {
        "Fn::Base64": "#!/bin/bash\nservice some-dependency start\nservice my-app start",
      },
    });
  });

  test("adds any target groups passed through props", () => {
    const stack = simpleGuStackForTesting();

    const targetGroup = new GuApplicationTargetGroup(stack, "TargetGroup", {
      vpc: vpc,
      protocol: ApplicationProtocol.HTTP,
      overrideId: true,
    });

    new GuAutoScalingGroup(stack, "AutoscalingGroup", {
      ...defaultProps,
      targetGroup: targetGroup,
    });

    expect(stack).toHaveResource("AWS::AutoScaling::AutoScalingGroup", {
      TargetGroupARNs: [
        {
          Ref: "TargetGroup",
        },
      ],
    });
  });

  test("adds any security groups passed through props", () => {
    const app = "Testing";
    const stack = simpleGuStackForTesting();

    const securityGroup = new GuSecurityGroup(stack, "SecurityGroup", { vpc, overrideId: true, app });
    const securityGroup1 = new GuSecurityGroup(stack, "SecurityGroup1", { vpc, overrideId: true, app });
    const securityGroup2 = new GuSecurityGroup(stack, "SecurityGroup2", { vpc, overrideId: true, app });

    new GuAutoScalingGroup(stack, "AutoscalingGroup", {
      ...defaultProps,
      additionalSecurityGroups: [securityGroup, securityGroup1, securityGroup2],
    });

    expect(stack).toHaveResource("AWS::AutoScaling::LaunchConfiguration", {
      SecurityGroups: [
        {
          "Fn::GetAtt": [`GuHttpsEgressSecurityGroup${app}89CDDA4B`, "GroupId"],
        },
        {
          "Fn::GetAtt": [`SecurityGroup${app}`, "GroupId"],
        },
        {
          "Fn::GetAtt": [`SecurityGroup1${app}`, "GroupId"],
        },
        {
          "Fn::GetAtt": [`SecurityGroup2${app}`, "GroupId"],
        },
      ],
    });
  });

  test("does not include the UpdatePolicy property", () => {
    const stack = simpleGuStackForTesting();
    new GuAutoScalingGroup(stack, "AutoscalingGroup", { ...defaultProps });

    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::AutoScaling::AutoScalingGroup", /AutoscalingGroup.+/);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- the `toHaveResourceOfTypeAndLogicalId` line above confirms `asgResource` will not be `undefined`
    const asgResource: Resource = findResourceByTypeAndLogicalId(
      stack,
      "AWS::AutoScaling::AutoScalingGroup",
      /AutoscalingGroup.+/
    )!;

    // This is checking the properties of the ASG resource
    // TODO improve the syntax
    expect(Object.keys(Object.values(asgResource)[0])).not.toContain("UpdatePolicy");
  });

  test("overrides the id with the overrideId prop set to true", () => {
    const stack = simpleGuStackForTesting();
    new GuAutoScalingGroup(stack, "AutoscalingGroup", { ...defaultProps, overrideId: true });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(Object.keys(json.Resources)).toContain("AutoscalingGroup");
  });

  test("does not override the id by default", () => {
    const stack = simpleGuStackForTesting();
    new GuAutoScalingGroup(stack, "AutoscalingGroup", defaultProps);

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(Object.keys(json.Resources)).not.toContain("AutoscalingGroup");
  });

  test("adds the correct mappings when provided with minimal capacity config", () => {
    const stack = simpleGuStackForTesting();
    new GuAutoScalingGroup(stack, "AutoscalingGroup", defaultProps);

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Mappings).toEqual({
      stagemapping: {
        CODE: {
          minInstances: 1,
          maxInstances: 2,
        },
        PROD: {
          minInstances: 3,
          maxInstances: 6,
        },
      },
    });
  });

  test("uses custom max capacities (if provided)", () => {
    const stack = simpleGuStackForTesting();
    new GuAutoScalingGroup(stack, "AutoscalingGroup", {
      ...defaultProps,
      stageDependentProps: {
        [Stage.CODE]: {
          minimumInstances: 1,
          maximumInstances: 5,
        },
        [Stage.PROD]: {
          minimumInstances: 3,
          maximumInstances: 7,
        },
      },
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Mappings).toEqual({
      stagemapping: {
        CODE: {
          minInstances: 1,
          maxInstances: 5,
        },
        PROD: {
          minInstances: 3,
          maxInstances: 7,
        },
      },
    });
  });

  test("Uses Find In Map correctly to reference capacity mappings", () => {
    const stack = simpleGuStackForTesting();
    new GuAutoScalingGroup(stack, "AutoscalingGroup", defaultProps);

    expect(stack).toHaveResource("AWS::AutoScaling::AutoScalingGroup", {
      MinSize: {
        "Fn::FindInMap": [
          "stagemapping",
          {
            Ref: "Stage",
          },
          "minInstances",
        ],
      },
      MaxSize: {
        "Fn::FindInMap": [
          "stagemapping",
          {
            Ref: "Stage",
          },
          "maxInstances",
        ],
      },
    });
  });
});
