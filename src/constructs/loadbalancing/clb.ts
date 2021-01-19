import type { CfnLoadBalancer, LoadBalancerProps } from "@aws-cdk/aws-elasticloadbalancing";
import { LoadBalancer } from "@aws-cdk/aws-elasticloadbalancing";
import type { GuStack } from "../core";

enum RemoveableProperties {
  SCHEME = "Scheme",
}

interface GuClassicLoadBalancerProps extends LoadBalancerProps {
  overrideId?: boolean;
  propertiesToRemove?: RemoveableProperties[];
  propertiesToOverride?: Record<string, unknown>;
}

export class GuClassicLoadBalancer extends LoadBalancer {
  static RemoveableProperties = RemoveableProperties;

  constructor(scope: GuStack, id: string, props: GuClassicLoadBalancerProps) {
    super(scope, id, props);

    const cfnLb = this.node.defaultChild as CfnLoadBalancer;

    if (props.overrideId || (scope.migratedFromCloudFormation && props.overrideId !== false))
      cfnLb.overrideLogicalId(id);

    props.propertiesToRemove?.forEach((key) => {
      cfnLb.addPropertyDeletionOverride(key);
    });

    props.propertiesToOverride &&
      Object.entries(props.propertiesToOverride).forEach(([key, value]) => cfnLb.addPropertyOverride(key, value));
  }
}
