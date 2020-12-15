import { SynthUtils } from "@aws-cdk/assert";
import "@aws-cdk/assert/jest";
import { Effect, PolicyStatement, Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import { App } from "@aws-cdk/core";
import type { SynthedStack } from "../../../test/utils/synthed-stack";
import { GuStack } from "../core";
import { GuGetS3ObjectPolicy, GuLogShippingPolicy, GuPolicy, GuSSMRunCommandPolicy } from "./policies";

describe("The GuPolicy", () => {
  it("overrides id if prop set to true", () => {
    const stack = new GuStack(new App());
    const policy = new GuPolicy(stack, "Policy", {
      overrideId: true,
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:GetObject"],
          resources: [`arn:aws:s3:::test/*`],
        }),
      ],
    });

    policy.attachToRole(
      new Role(stack, "TestRole", {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      })
    );

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(Object.keys(json.Resources)).toContain("Policy");
  });

  it("does not override id if prop set to false", () => {
    const stack = new GuStack(new App());
    const policy = new GuPolicy(stack, "Policy", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:GetObject"],
          resources: [`arn:aws:s3:::test/*`],
        }),
      ],
    });

    policy.attachToRole(
      new Role(stack, "TestRole", {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      })
    );

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(Object.keys(json.Resources)).not.toContain("Policy");
  });
});

describe("The GuLogShippingPolicy class", () => {
  it("sets default props", () => {
    const stack = new GuStack(new App());

    const logShippingPolicy = new GuLogShippingPolicy(stack, "SSMRunCommandPolicy", { kinesisStreamName: "test" });

    // IAM Policies need to be attached to a role, group or user to be created in a stack
    logShippingPolicy.attachToRole(
      new Role(stack, "TestRole", {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      })
    );

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyName: "log-shipping-policy",
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
                  ":stream/test",
                ],
              ],
            },
          },
        ],
      },
    });
  });

  it("merges defaults and passed in props", () => {
    const stack = new GuStack(new App());

    const logShippingPolicy = new GuLogShippingPolicy(stack, "SSMRunCommandPolicy", {
      kinesisStreamName: "test",
      policyName: "test",
    });

    // IAM Policies need to be attached to a role, group or user to be created in a stack
    logShippingPolicy.attachToRole(
      new Role(stack, "TestRole", {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      })
    );

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyName: "test",
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
                  ":stream/test",
                ],
              ],
            },
          },
        ],
      },
    });
  });
});

describe("The GuSSMRunCommandPolicy class", () => {
  it("sets default props", () => {
    const stack = new GuStack(new App());

    const ssmPolicy = new GuSSMRunCommandPolicy(stack, "SSMRunCommandPolicy", {});

    // IAM Policies need to be attached to a role, group or user to be created in a stack
    ssmPolicy.attachToRole(
      new Role(stack, "TestRole", {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      })
    );

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyName: "ssm-run-command-policy",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Resource: "*",
            Action: [
              "ec2messages:AcknowledgeMessage",
              "ec2messages:DeleteMessage",
              "ec2messages:FailMessage",
              "ec2messages:GetEndpoint",
              "ec2messages:GetMessages",
              "ec2messages:SendReply",
              "ssm:UpdateInstanceInformation",
              "ssm:ListInstanceAssociations",
              "ssm:DescribeInstanceProperties",
              "ssm:DescribeDocumentParameters",
              "ssmmessages:CreateControlChannel",
              "ssmmessages:CreateDataChannel",
              "ssmmessages:OpenControlChannel",
              "ssmmessages:OpenDataChannel",
            ],
          },
        ],
      },
    });
  });

  it("merges defaults and passed in props", () => {
    const stack = new GuStack(new App());

    const ssmPolicy = new GuSSMRunCommandPolicy(stack, "SSMRunCommandPolicy", {
      policyName: "test",
    });

    // IAM Policies need to be attached to a role, group or user to be created in a stack
    ssmPolicy.attachToRole(
      new Role(stack, "TestRole", {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      })
    );

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyName: "test",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Resource: "*",
            Action: [
              "ec2messages:AcknowledgeMessage",
              "ec2messages:DeleteMessage",
              "ec2messages:FailMessage",
              "ec2messages:GetEndpoint",
              "ec2messages:GetMessages",
              "ec2messages:SendReply",
              "ssm:UpdateInstanceInformation",
              "ssm:ListInstanceAssociations",
              "ssm:DescribeInstanceProperties",
              "ssm:DescribeDocumentParameters",
              "ssmmessages:CreateControlChannel",
              "ssmmessages:CreateDataChannel",
              "ssmmessages:OpenControlChannel",
              "ssmmessages:OpenDataChannel",
            ],
          },
        ],
      },
    });
  });
});

describe("The GuGetS3ObjectPolicy class", () => {
  it("sets default props", () => {
    const stack = new GuStack(new App());

    const s3Policy = new GuGetS3ObjectPolicy(stack, "S3Policy", { bucket: "test" });

    // IAM Policies need to be attached to a role, group or user to be created in a stack
    s3Policy.attachToRole(
      new Role(stack, "TestRole", {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      })
    );

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Resource: "arn:aws:s3:::test/*",
            Action: "s3:GetObject",
          },
        ],
      },
    });
  });

  it("merges defaults and passed in props", () => {
    const stack = new GuStack(new App());

    const s3Policy = new GuGetS3ObjectPolicy(stack, "S3Policy", { bucket: "test", policyName: "test" });

    // IAM Policies need to be attached to a role, group or user to be created in a stack
    s3Policy.attachToRole(
      new Role(stack, "TestRole", {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      })
    );

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyName: "test",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Resource: "arn:aws:s3:::test/*",
            Action: "s3:GetObject",
          },
        ],
      },
    });
  });
});
