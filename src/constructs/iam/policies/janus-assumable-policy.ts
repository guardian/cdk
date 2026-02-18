import type { ManagedPolicyProps } from "aws-cdk-lib/aws-iam";

export interface GuJanusAssumablePolicyProps extends ManagedPolicyProps {
  /**
   * Tells Janus which ProvisionedRole this IAM role is part of.
   */
  janusPermission: string;

  /**
   * A friendly name for this IAM role to be shown in Janus.
   * It should help Janus users to choose the right role.
   */
  janusName?: string;

  /**
   * A description of this IAM Policy Group to be shown in Janus.
   * It should help Janus users to choose the right role.
   */
  janusDescription?: string;
}
