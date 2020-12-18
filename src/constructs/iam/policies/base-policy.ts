import type { CfnPolicy, PolicyProps } from "@aws-cdk/aws-iam";
import { Policy } from "@aws-cdk/aws-iam";
import type { GuStack } from "../../core";

export interface GuPolicyProps extends PolicyProps {
  overrideId?: boolean;
}

export abstract class GuPolicy extends Policy {
  protected constructor(scope: GuStack, id: string, props: GuPolicyProps) {
    super(scope, id, props);

    if (props.overrideId) {
      const child = this.node.defaultChild as CfnPolicy;
      child.overrideLogicalId(id);
    }
  }
}
