import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { isSingletonPresentInStack } from "../../../utils/singleton";
import type { GuStack } from "../../core";
import { GuAllowPolicy } from "./base-policy";

/**
 * A minimal policy enabling SSM+SSH access to EC2 instances.
 *
 * This is favoured over the AWS Managed Policy `AmazonSSMManagedInstanceCore`,
 * `AmazonSSMManagedInstanceCore` provides read access to all SSM Parameters.
 * This is not required for SSM+SSH, and given our usage of SSM Parameters for configuration, is not following least privilege.
 * Access to SSM Parameters should be scoped to the Stack, Stage, and Application.
 *
 * @see https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonSSMManagedInstanceCore.html
 * @see https://github.com/guardian/ssm-scala
 */
export class GuSsmSshPolicy extends GuAllowPolicy {
  static buildStatements(): PolicyStatement[] {
    return [
      new PolicyStatement({
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
      }),
    ];
  }

  private static instance: GuSsmSshPolicy | undefined;

  private constructor(scope: GuStack) {
    super(scope, "SsmSshPolicy", {
      policyName: "ssm-ssh-policy",
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

      // TODO can this be scoped to the stack, stage, and application? If so, it won't make sense to be a singleton.
      resources: ["*"],
    });
  }

  public static getInstance(stack: GuStack): GuSsmSshPolicy {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuSsmSshPolicy(stack);
    }

    return this.instance;
  }
}
