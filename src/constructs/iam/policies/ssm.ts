import { isSingletonPresentInStack } from "../../../utils/singleton";
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
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuSSMRunCommandPolicy(stack);
    }

    return this.instance;
  }
}
