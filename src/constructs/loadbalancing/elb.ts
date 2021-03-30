import type {
  CfnLoadBalancer,
  HealthCheck,
  LoadBalancerListener,
  LoadBalancerProps,
} from "@aws-cdk/aws-elasticloadbalancing";
import { LoadBalancer, LoadBalancingProtocol } from "@aws-cdk/aws-elasticloadbalancing";
import { Duration } from "@aws-cdk/core";
import type { GuStack } from "../core";
import { GuArnParameter } from "../core";

interface GuClassicLoadBalancerProps extends Omit<LoadBalancerProps, "healthCheck"> {
  overrideId?: boolean;
  propertiesToOverride?: Record<string, unknown>;
  healthCheck?: Partial<HealthCheck>;
}

export class GuClassicLoadBalancer extends LoadBalancer {
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

    mergedProps.propertiesToOverride &&
      Object.entries(mergedProps.propertiesToOverride).forEach(([key, value]) => cfnLb.addPropertyOverride(key, value));
  }
}

interface GuHttpsClassicLoadBalancerProps extends Omit<GuClassicLoadBalancerProps, "listeners"> {
  listener?: Partial<LoadBalancerListener>;
}

export class GuHttpsClassicLoadBalancer extends GuClassicLoadBalancer {
  static DefaultListener: LoadBalancerListener = {
    internalPort: 9000,
    externalPort: 443,
    internalProtocol: LoadBalancingProtocol.HTTP,
    externalProtocol: LoadBalancingProtocol.HTTPS,
  };

  constructor(scope: GuStack, id: string, props: GuHttpsClassicLoadBalancerProps) {
    const listenerProps = { ...GuHttpsClassicLoadBalancer.DefaultListener, ...props.listener };

    if (!listenerProps.sslCertificateId) {
      const certificateId = new GuArnParameter(scope, "CertificateARN", {
        description: "Certificate ARN for ELB",
      });
      listenerProps.sslCertificateId = certificateId.valueAsString;
    }

    const mergedProps = {
      ...props,
      listeners: [listenerProps],
    };

    super(scope, id, mergedProps);
  }
}
