import { Template } from "aws-cdk-lib/assertions";
import { attachManagedPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuSsmSshManagedPolicy } from "./ssm-ssh";

describe("The GuSsmSshManagedPolicy construct", () => {
  it("creates the correct managed policy", () => {
    const stack = simpleGuStackForTesting();
    attachManagedPolicyToTestRole(stack, GuSsmSshManagedPolicy.getInstance(stack));

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::ManagedPolicy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
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
            Effect: "Allow",
            Resource: "*",
          },
        ],
      },
    });
  });

  it("will only be defined once in a stack, even when attached to multiple roles", () => {
    const stack = simpleGuStackForTesting();

    const ssmSshManagedPolicy = GuSsmSshManagedPolicy.getInstance(stack);
    attachManagedPolicyToTestRole(stack, ssmSshManagedPolicy, "MyFirstRole");
    attachManagedPolicyToTestRole(stack, ssmSshManagedPolicy, "MySecondRole");

    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::IAM::ManagedPolicy", 1);
    // 2 test roles + 1 AwsCustomResource Lambda execution role for tagging
    template.resourceCountIs("AWS::IAM::Role", 3);
  });

  it("works across multiple stacks", () => {
    const stack1 = simpleGuStackForTesting();
    const stack2 = simpleGuStackForTesting();

    const ssmSshManagedPolicy1 = GuSsmSshManagedPolicy.getInstance(stack1);
    const ssmSshManagedPolicy2 = GuSsmSshManagedPolicy.getInstance(stack2);

    attachManagedPolicyToTestRole(stack1, ssmSshManagedPolicy1);
    attachManagedPolicyToTestRole(stack2, ssmSshManagedPolicy2);

    const template1 = Template.fromStack(stack1);
    template1.resourceCountIs("AWS::IAM::ManagedPolicy", 1);
    // 1 test role + 1 AwsCustomResource Lambda execution role for tagging
    template1.resourceCountIs("AWS::IAM::Role", 2);

    const template2 = Template.fromStack(stack2);
    template2.resourceCountIs("AWS::IAM::ManagedPolicy", 1);
    template2.resourceCountIs("AWS::IAM::Role", 2);
  });
});
