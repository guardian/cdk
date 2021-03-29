import type { GuStack } from "../../core";
import { GuAllowPolicy } from "./base-policy";

export class GuSSMRunCommandPolicy extends GuAllowPolicy {
  private static instance: GuSSMRunCommandPolicy | undefined;

  private constructor(scope: GuStack) {
    super(scope, "SSMRunCommandPolicy", {
      policyName: "ssm-run-command-policy",
      resources: ["*"],
      actions: [
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
    });
  }

  public static getInstance(stack: GuStack): GuSSMRunCommandPolicy {
    // Resources can only live in the same App so return a new `GuSSMRunCommandPolicy` where necessary.
    // See https://github.com/aws/aws-cdk/blob/0ea4b19afd639541e5f1d7c1783032ee480c307e/packages/%40aws-cdk/core/lib/private/refs.ts#L47-L50
    const isSameStack = this.instance?.node.root === stack.node.root;

    if (!this.instance || !isSameStack) {
      this.instance = new GuSSMRunCommandPolicy(stack);
    }

    return this.instance;
  }
}
