import type { CfnLoadBalancer, LoadBalancerProps } from "@aws-cdk/aws-elasticloadbalancing";
import { LoadBalancer } from "@aws-cdk/aws-elasticloadbalancing";
import type { GuStack } from "../core";

interface GuClassicLoadBalancerProps extends LoadBalancerProps {
  overrideId?: boolean;
}

export class GuClassicLoadBalancer extends LoadBalancer {
  constructor(scope: GuStack, id: string, props: GuClassicLoadBalancerProps) {
    super(scope, id, props);

    const cfnLb = this.node.defaultChild as CfnLoadBalancer;

    if (props.overrideId) cfnLb.overrideLogicalId(id);
  }
}
