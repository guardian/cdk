import type { CfnPolicy, PolicyProps } from "@aws-cdk/aws-iam";
import { Policy } from "@aws-cdk/aws-iam";
import type { GuStack } from "../../core";

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
