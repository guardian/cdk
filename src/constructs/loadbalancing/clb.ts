import type { CfnLoadBalancer, LoadBalancerProps } from "@aws-cdk/aws-elasticloadbalancing";
import { LoadBalancer } from "@aws-cdk/aws-elasticloadbalancing";
import type { GuStack } from "../core";

enum DeletionOverrideProperties {
  SCHEME = "Scheme",
}

interface GuClassicLoadBalancerProps extends LoadBalancerProps {
  overrideId?: boolean;
  deletionOverrideProperties?: DeletionOverrideProperties[];
  overrideProperties?: Record<string, unknown>;
}

export class GuClassicLoadBalancer extends LoadBalancer {
  static DeletionOverrideProperties = DeletionOverrideProperties;

  constructor(scope: GuStack, id: string, props: GuClassicLoadBalancerProps) {
    super(scope, id, props);

    const cfnLb = this.node.defaultChild as CfnLoadBalancer;

    if (props.overrideId) cfnLb.overrideLogicalId(id);

    props.deletionOverrideProperties?.forEach((key) => {
      cfnLb.addPropertyDeletionOverride(key);
    });

    props.overrideProperties &&
      Object.entries(props.overrideProperties).forEach(([key, value]) => cfnLb.addPropertyOverride(key, value));
  }
}
