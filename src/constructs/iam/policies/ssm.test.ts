import { Template } from "aws-cdk-lib/assertions";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuSSMRunCommandPolicy } from "./ssm";

describe("The GuSSMRunCommandPolicy class", () => {
  it("sets default props", () => {
    const stack = simpleGuStackForTesting();

    const ssmPolicy = GuSSMRunCommandPolicy.getInstance(stack);

    attachPolicyToTestRole(stack, ssmPolicy);

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
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
});
