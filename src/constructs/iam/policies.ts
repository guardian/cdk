// TODO split this file up

import type { CfnPolicy, PolicyProps } from "@aws-cdk/aws-iam";
import { Effect, Policy, PolicyStatement } from "@aws-cdk/aws-iam";
import type { GuStack } from "../core";

export interface GuPolicyProps extends PolicyProps {
  overrideId?: boolean;
}

export class GuPolicy extends Policy {
  static defaultProps: Partial<GuPolicyProps> = {};

  constructor(scope: GuStack, id: string, props: GuPolicyProps) {
    super(scope, id, { ...GuPolicy.defaultProps, ...props });

    if (props.overrideId) {
      const child = this.node.defaultChild as CfnPolicy;
      child.overrideLogicalId(id);
    }
  }
}

export interface GuLogShippingPolicyProps extends GuPolicyProps {
  kinesisStreamName: string;
}

// TODO: Should the constructor require a stack (which so far is the only thing it ever will be) or
// should we pass through account and region explicitly?
export class GuLogShippingPolicy extends GuPolicy {
  private static getDefaultProps(scope: GuStack, props: GuLogShippingPolicyProps): Partial<PolicyProps> {
    return {
      policyName: "log-shipping-policy",
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["kinesis:Describe*", "kinesis:Put*"],
          resources: [`arn:aws:kinesis:${scope.region}:${scope.account}:stream/${props.kinesisStreamName}`],
        }),
      ],
    };
  }

  constructor(scope: GuStack, id: string = "LogShippingPolicy", props: GuLogShippingPolicyProps) {
    super(scope, id, {
      ...GuLogShippingPolicy.getDefaultProps(scope, props),
      ...props,
    });
  }
}

export class GuSSMRunCommandPolicy extends GuPolicy {
  // TODO: Is it worth extracting some of these defaults to make them easier to use
  //       in their own right elsewhere
  private static getDefaultProps(): Partial<PolicyProps> {
    return {
      policyName: "ssm-run-command-policy",
      statements: [
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
      ],
    };
  }

  // TODO: It's not possible to use the default id if you want to pass props in, should it?
  constructor(scope: GuStack, id: string = "SSMRunCommandPolicy", props: GuPolicyProps) {
    super(scope, id, {
      ...GuSSMRunCommandPolicy.getDefaultProps(),
      ...props,
    });
  }
}

export interface GuGetS3ObjectPolicyProps extends GuPolicyProps {
  bucket: string;
}

export class GuGetS3ObjectPolicy extends GuPolicy {
  constructor(scope: GuStack, id: string, props: GuGetS3ObjectPolicyProps) {
    // TODO validate `props.bucket` based on the rules defined here https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-s3-bucket-naming-requirements.html

    const policy = {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:GetObject"],
          resources: [`arn:aws:s3:::${props.bucket}/*`],
        }),
      ],
    };

    super(scope, id, { ...policy, ...props });
  }
}
