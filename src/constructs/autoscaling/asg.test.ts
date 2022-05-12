import { Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { InstanceClass, InstanceSize, InstanceType, UserData, Vpc } from "aws-cdk-lib/aws-ec2";
import { ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { GuTemplate, simpleGuStackForTesting } from "../../utils/test";
import type { AppIdentity } from "../core";
import { GuSecurityGroup } from "../ec2";
import { GuAllowPolicy, GuInstanceRole } from "../iam";
import { GuApplicationTargetGroup } from "../loadbalancing";
import type { GuAutoScalingGroupProps } from "./asg";
import { GuAutoScalingGroup } from "./";

describe("The GuAutoScalingGroup", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  const app: AppIdentity = {
    app: "testing",
  };

  const defaultProps: GuAutoScalingGroupProps = {
    ...app,
    vpc,
    instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
    userData: UserData.custom(["#!/bin/bash", "service some-dependency start", "service my-app start"].join("\n")),
    minimumInstances: 1,
  };

  test("Uses the AppIdentity to create the logicalId and tag the resource", () => {
    const stack = simpleGuStackForTesting();
    new GuAutoScalingGroup(stack, "MyAutoScalingGroup", defaultProps);

    const template = GuTemplate.fromStack(stack);

    template.hasResourceWithLogicalId("AWS::AutoScaling::AutoScalingGroup", /MyAutoScalingGroupTesting[A-Z0-9]+/);
    template.hasGuTaggedResource("AWS::AutoScaling::AutoScalingGroup", {
      appIdentity: { app: "testing" },
      propagateAtLaunch: true,
      additionalTags: [
        {
          Key: "Name",
          PropagateAtLaunch: true,
          Value: "Test/MyAutoScalingGroupTesting",
        },
      ],
    });
  });

  test("adds the AMI parameter if no imageId prop provided", () => {
    const stack = simpleGuStackForTesting();

    new GuAutoScalingGroup(stack, "AutoscalingGroup", defaultProps);

    const template = Template.fromStack(stack);

    template.hasParameter("AMITesting", {
      Description:
        "Amazon Machine Image ID for the app testing. Use this in conjunction with AMIgo to keep AMIs up to date.",
      Type: "AWS::EC2::Image::Id",
    });

    template.hasResourceProperties("AWS::AutoScaling::LaunchConfiguration", {
      ImageId: {
        Ref: "AMITesting",
      },
    });
  });

  test("correctly sets up the instance type in the launch configuration", () => {
    const stack = simpleGuStackForTesting();

    new GuAutoScalingGroup(stack, "AutoscalingGroup", { ...defaultProps, instanceType: new InstanceType("t3.small") });

    Template.fromStack(stack).hasResourceProperties("AWS::AutoScaling::LaunchConfiguration", {
      InstanceType: "t3.small",
    });
  });

  test("correctly sets the user data using prop", () => {
    const stack = simpleGuStackForTesting();

    new GuAutoScalingGroup(stack, "AutoscalingGroup", defaultProps);

    Template.fromStack(stack).hasResourceProperties("AWS::AutoScaling::LaunchConfiguration", {
      UserData: {
        "Fn::Base64": "#!/bin/bash\nservice some-dependency start\nservice my-app start",
      },
    });
  });

  test("adds any target groups passed through props", () => {
    const stack = simpleGuStackForTesting();

    const targetGroup = new GuApplicationTargetGroup(stack, "TargetGroup", {
      ...app,
      vpc: vpc,
      protocol: ApplicationProtocol.HTTP,
    });

    new GuAutoScalingGroup(stack, "AutoscalingGroup", {
      ...defaultProps,
      targetGroup: targetGroup,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::AutoScaling::AutoScalingGroup", {
      TargetGroupARNs: [
        {
          Ref: Match.stringLikeRegexp("TargetGroupTesting[A-Z0-9]+"),
        },
      ],
    });
  });

  test("adds any security groups passed through props", () => {
    const app = "Testing";
    const stack = simpleGuStackForTesting();

    // not passing `existingLogicalId`, so logicalId will be auto-generated
    const securityGroup = new GuSecurityGroup(stack, "SecurityGroup", { vpc, app });
    const securityGroup1 = new GuSecurityGroup(stack, "SecurityGroup1", { vpc, app });
    const securityGroup2 = new GuSecurityGroup(stack, "SecurityGroup2", { vpc, app });

    new GuAutoScalingGroup(stack, "AutoscalingGroup", {
      ...defaultProps,
      additionalSecurityGroups: [securityGroup, securityGroup1, securityGroup2],
    });

    Template.fromStack(stack).hasResourceProperties("AWS::AutoScaling::LaunchConfiguration", {
      SecurityGroups: [
        {
          "Fn::GetAtt": [Match.stringLikeRegexp(`GuHttpsEgressSecurityGroup${app}[A-Z0-9]+`), "GroupId"],
        },
        {
          "Fn::GetAtt": ["WazuhSecurityGroup", "GroupId"],
        },
        {
          "Fn::GetAtt": [Match.stringLikeRegexp("SecurityGroupTesting[A-Z0-9]+"), "GroupId"],
        },
        {
          "Fn::GetAtt": [Match.stringLikeRegexp("SecurityGroup1Testing[A-Z0-9]+"), "GroupId"],
        },
        {
          "Fn::GetAtt": [Match.stringLikeRegexp("SecurityGroup2Testing[A-Z0-9]+"), "GroupId"],
        },
      ],
    });
  });

  test("does not include the UpdatePolicy property", () => {
    const stack = simpleGuStackForTesting();
    new GuAutoScalingGroup(stack, "AutoscalingGroup", { ...defaultProps });

    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::AutoScaling::AutoScalingGroup", /AutoscalingGroup.+/);

    Template.fromStack(stack).hasResourceProperties("AWS::AutoScaling::AutoScalingGroup", {
      UpdatePolicy: Match.absent(),
    });
  });

  test("overrides the logicalId when existingLogicalId is set", () => {
    const stack = simpleGuStackForTesting();
    new GuAutoScalingGroup(stack, "AutoscalingGroup", {
      ...defaultProps,
      existingLogicalId: { logicalId: "MyASG", reason: "testing" },
    });

    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::AutoScaling::AutoScalingGroup", "MyASG");
  });

  test("auto-generates the logicalId by default", () => {
    const stack = simpleGuStackForTesting();
    new GuAutoScalingGroup(stack, "AutoscalingGroup", defaultProps);

    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::AutoScaling::AutoScalingGroup", /^AutoscalingGroup.+$/);
  });

  test("has an instance role created by default with AssumeRole permissions", () => {
    const stack = simpleGuStackForTesting();

    new GuAutoScalingGroup(stack, "AutoscalingGroup", {
      app: "TestApp",
      userData: "SomeUserData",
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      vpc,
      minimumInstances: 1,
    });

    GuTemplate.fromStack(stack).hasGuTaggedResource("AWS::IAM::Role", { appIdentity: { app: "TestApp" } });

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: { Service: { "Fn::Join": ["", ["ec2.", { Ref: "AWS::URLSuffix" }]] } },
          },
        ],
      },
    });
  });

  test("passing in an instance role overrides the default", () => {
    const stack = simpleGuStackForTesting();

    new GuAutoScalingGroup(stack, "AutoscalingGroup", {
      app: "TestApp",
      userData: "UserData",
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      vpc,
      role: new GuInstanceRole(stack, {
        app: "TestApp",
        additionalPolicies: [
          new GuAllowPolicy(stack, "SomePolicy", {
            actions: ["some:Action"],
            resources: ["some:Resource"],
          }),
        ],
      }),
      minimumInstances: 1,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: { Service: { "Fn::Join": ["", ["ec2.", { Ref: "AWS::URLSuffix" }]] } },
          },
        ],
        Version: "2012-10-17",
      },
    });

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "some:Action",
            Effect: "Allow",
            Resource: "some:Resource",
          },
        ],
      },
    });
  });

  test("by default, the maximum capacity is double the minimum", () => {
    const stack = simpleGuStackForTesting();

    new GuAutoScalingGroup(stack, "AutoscalingGroup", {
      app: "TestApp",
      userData: "SomeUserData",
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      vpc,
      minimumInstances: 3,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::AutoScaling::AutoScalingGroup", {
      MinSize: "3",
      MaxSize: "6",
    });
  });

  test("scaling capacities can be overridden", () => {
    const stack = simpleGuStackForTesting();

    new GuAutoScalingGroup(stack, "AutoscalingGroup", {
      app: "TestApp",
      userData: "SomeUserData",
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      vpc,
      minimumInstances: 2,
      maximumInstances: 11,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::AutoScaling::AutoScalingGroup", {
      MinSize: "2",
      MaxSize: "11",
    });
  });
});
