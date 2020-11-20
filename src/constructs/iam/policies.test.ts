import "@aws-cdk/assert/jest";
import { Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import { Stack } from "@aws-cdk/core";
import { GuSSMRunCommandPolicy } from "./policies";

test("GuSSMRunCommandPolicy component", () => {
  const stack = new Stack();

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
