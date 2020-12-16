import type { PolicyProps } from "@aws-cdk/aws-iam";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import type { GuStack } from "../../core";
import type { GuPolicyProps } from "./base-policy";
import { GuPolicy } from "./base-policy";

export const allowSSMRunCommandPolicyStatement = new PolicyStatement({
  effect: Effect.ALLOW,
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
  resources: ["*"],
});

export class GuSSMRunCommandPolicy extends GuPolicy {
  private static getDefaultProps(): Partial<PolicyProps> {
    return {
      policyName: "ssm-run-command-policy",
      statements: [allowSSMRunCommandPolicyStatement],
    };
  }

  constructor(scope: GuStack, id: string = "SSMRunCommandPolicy", props: GuPolicyProps = { overrideId: false }) {
    super(scope, id, {
      ...GuSSMRunCommandPolicy.getDefaultProps(),
      ...props,
    });
  }
}
