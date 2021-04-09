import type { ApplicationLoadBalancerProps, CfnLoadBalancer } from "@aws-cdk/aws-elasticloadbalancingv2";
import { ApplicationLoadBalancer } from "@aws-cdk/aws-elasticloadbalancingv2";
import type { GuStack } from "../../core";
import { AppIdentity } from "../../core/identity";

interface GuApplicationLoadBalancerProps extends ApplicationLoadBalancerProps, AppIdentity {
  overrideId?: boolean;
}

export class GuApplicationLoadBalancer extends ApplicationLoadBalancer {
  constructor(scope: GuStack, id: string, props: GuApplicationLoadBalancerProps) {
    const { app } = props;

    super(scope, AppIdentity.suffixText({ app }, id), { deletionProtection: true, ...props });

    const cfnLb = this.node.defaultChild as CfnLoadBalancer;

    if (props.overrideId || (scope.migratedFromCloudFormation && props.overrideId !== false))
      cfnLb.overrideLogicalId(id);

    cfnLb.addPropertyDeletionOverride("Type");
  }
}
