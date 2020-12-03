import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import { Vpc } from "@aws-cdk/aws-ec2";
import { ApplicationProtocol } from "@aws-cdk/aws-elasticloadbalancingv2";
import { App, Stack } from "@aws-cdk/core";
import { GuStack } from "../core/stack";
import { GuSecurityGroup } from "../ec2";
import { GuApplicationTargetGroup } from "../loadbalancing";
import type { GuAutoScalingGroupProps } from "./asg";
import { GuAutoScalingGroup } from "./asg";

interface SynthedStack {
  Resources: Record<string, { Properties: Record<string, unknown> }>;
}

describe("The GuAutoScalingGroup", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });
  const defaultProps: GuAutoScalingGroupProps = {
    vpc,
    imageId: "123",
    instanceType: "t3.macro", // Use a value that doesn't exist to ensure that we haven't matched a default
    userData: "user data",
  };

  test("correctly sets the machine image using props and calling getImage", () => {
    const app = new App();
    const stack = new GuStack(app);

    new GuAutoScalingGroup(stack, "AutoscalingGroup", { ...defaultProps, osType: 1 });

    expect(stack).toHaveResource("AWS::AutoScaling::LaunchConfiguration", {
      ImageId: "123",
    });
  });

  test("correctly sets instance type using prop", () => {
    const app = new App();
    const stack = new GuStack(app);

    new GuAutoScalingGroup(stack, "AutoscalingGroup", defaultProps);

    expect(stack).toHaveResource("AWS::AutoScaling::LaunchConfiguration", {
      InstanceType: "t3.macro",
    });
  });

  test("correctly sets the user data using prop", () => {
    const app = new App();
    const stack = new GuStack(app);

    new GuAutoScalingGroup(stack, "AutoscalingGroup", defaultProps);

    expect(stack).toHaveResource("AWS::AutoScaling::LaunchConfiguration", {
      UserData: {
        "Fn::Base64": "user data",
      },
    });
  });

  test("adds any target groups passed through props", () => {
    const app = new App();
    const stack = new GuStack(app);

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
    const app = new App();
    const stack = new GuStack(app);

    const securityGroup = new GuSecurityGroup(stack, "SecurityGroup", { vpc, overrideId: true });
    const securityGroup1 = new GuSecurityGroup(stack, "SecurityGroup1", { vpc, overrideId: true });
    const securityGroup2 = new GuSecurityGroup(stack, "SecurityGroup2", { vpc, overrideId: true });

    new GuAutoScalingGroup(stack, "AutoscalingGroup", {
      ...defaultProps,
      securityGroup,
      securityGroups: [securityGroup1, securityGroup2],
    });

    expect(stack).toHaveResource("AWS::AutoScaling::LaunchConfiguration", {
      SecurityGroups: [
        {
          "Fn::GetAtt": ["SecurityGroup", "GroupId"],
        },
        {
          "Fn::GetAtt": ["SecurityGroup1", "GroupId"],
        },
        {
          "Fn::GetAtt": ["SecurityGroup2", "GroupId"],
        },
      ],
    });
  });

  test("does not include the UpdatePolicy property", () => {
    const app = new App();
    const stack = new GuStack(app);
    new GuAutoScalingGroup(stack, "AutoscalingGroup", defaultProps);

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources.AutoscalingGroup)).not.toContain("UpdatePolicy");
  });

  test("overrides the id to remove the 8 digit value added automagically", () => {
    const app = new App();
    const stack = new GuStack(app);
    new GuAutoScalingGroup(stack, "AutoscalingGroup", defaultProps);

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(Object.keys(json.Resources)).toContain("AutoscalingGroup");
  });
});
