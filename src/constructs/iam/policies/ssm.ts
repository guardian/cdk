import type { GuStack } from "../../core";
import type { GuNoStatementsPolicyProps } from "./base-policy";
import { GuAllowPolicy } from "./base-policy";

export class GuSSMRunCommandPolicy extends GuAllowPolicy {
  constructor(scope: GuStack, id: string = "SSMRunCommandPolicy", props?: GuNoStatementsPolicyProps) {
    super(scope, id, {
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
      ...props,
    });
  }
}
