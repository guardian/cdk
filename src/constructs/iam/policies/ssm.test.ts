import "@aws-cdk/assert/jest";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../../test/utils";
import { GuSSMRunCommandPolicy } from "./ssm";

describe("The GuSSMRunCommandPolicy class", () => {
  it("sets default props", () => {
    const stack = simpleGuStackForTesting();

    const ssmPolicy = new GuSSMRunCommandPolicy(stack, "SSMRunCommandPolicy", {});

    attachPolicyToTestRole(stack, ssmPolicy);

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
    const stack = simpleGuStackForTesting();

    const ssmPolicy = new GuSSMRunCommandPolicy(stack, "SSMRunCommandPolicy", {
      policyName: "test",
    });

    attachPolicyToTestRole(stack, ssmPolicy);

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
