import type { CfnLoadBalancer, HealthCheck, LoadBalancerProps } from "@aws-cdk/aws-elasticloadbalancing";
import { LoadBalancer, LoadBalancingProtocol } from "@aws-cdk/aws-elasticloadbalancing";
import { Duration } from "@aws-cdk/core";
import type { GuStack } from "../core";

enum RemoveableProperties {
  SCHEME = "Scheme",
}

interface GuClassicLoadBalancerProps extends Omit<LoadBalancerProps, "healthCheck"> {
  overrideId?: boolean;
  propertiesToRemove?: RemoveableProperties[];
  propertiesToOverride?: Record<string, unknown>;
  healthCheck?: Partial<HealthCheck>;
}

export class GuClassicLoadBalancer extends LoadBalancer {
  static RemoveableProperties = RemoveableProperties;

  static DefaultHealthCheck = {
    port: 9000,
    path: "/healthcheck",
    protocol: LoadBalancingProtocol.HTTP,
    healthyThreshold: 2,
    unhealthyThreshold: 5,
    interval: Duration.seconds(30),
    timeout: Duration.seconds(10),
  };

  constructor(scope: GuStack, id: string, props: GuClassicLoadBalancerProps) {
    const mergedProps = {
      ...props,
      healthCheck: { ...GuClassicLoadBalancer.DefaultHealthCheck, ...props.healthCheck },
    };

    super(scope, id, mergedProps);

    const cfnLb = this.node.defaultChild as CfnLoadBalancer;

    if (mergedProps.overrideId || (scope.migratedFromCloudFormation && mergedProps.overrideId !== false))
      cfnLb.overrideLogicalId(id);

    mergedProps.propertiesToRemove?.forEach((key) => {
      cfnLb.addPropertyDeletionOverride(key);
    });

    mergedProps.propertiesToOverride &&
      Object.entries(mergedProps.propertiesToOverride).forEach(([key, value]) => cfnLb.addPropertyOverride(key, value));
  }
}
