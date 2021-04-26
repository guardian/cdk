import type {
  CfnLoadBalancer,
  HealthCheck,
  LoadBalancerListener,
  LoadBalancerProps,
} from "@aws-cdk/aws-elasticloadbalancing";
import { LoadBalancer, LoadBalancingProtocol } from "@aws-cdk/aws-elasticloadbalancing";
import { Duration } from "@aws-cdk/core";
import { GuStatefulMigratableConstruct } from "../../utils/mixin";
import type { GuStack } from "../core";
import { GuArnParameter } from "../core";
import { AppIdentity } from "../core/identity";
import type { GuMigratingResource } from "../core/migrating";

interface GuClassicLoadBalancerProps extends Omit<LoadBalancerProps, "healthCheck">, GuMigratingResource, AppIdentity {
  propertiesToOverride?: Record<string, unknown>;
  healthCheck?: Partial<HealthCheck>;
}

/**
 * **IMPORTANT**: This construct should **only** be used if you are migrating an existing stack and you need to retain the load balancer.
 * Please use [[`GuApplicationLoadBalancer`]] instead of [[`GuClassicLoadBalancer`]] wherever possible.
 *
 * In order to inherit an existing load balancer, the `migratedFromCloudFormation` prop on your stack must be set to `true`.
 * You must also pass the logical id from your CloudFormation template to this construct via the `existingLogicalId` prop.
 *
 * By default, load balancers created via this construct will perform a healthcheck against `/healthcheck` on port 9000. All healthcheck
 * defaults can be overridden via the `healthcheck` prop.
 *
 * For example, to use `/test` for the healthcheck path use:
 *
 * ```typescript
 * new GuClassicLoadBalancer(stack, "ClassicLoadBalancer", {
 *     // other props
 *     healthCheck: {
 *       path: "/test",
 *     },
 *   });
 * ```
 * If you are running an application which only accepts traffic over HTTPs, consider using [[`GuHttpsClassicLoadBalancer`]]
 * to reduce the amount of boilerplate needed when configuring your load balancer.
 */
export class GuClassicLoadBalancer extends GuStatefulMigratableConstruct(LoadBalancer) {
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

    super(scope, AppIdentity.suffixText({ app: props.app }, id), mergedProps);
    AppIdentity.taggedConstruct({ app: props.app }, this);

    const cfnLb = this.node.defaultChild as CfnLoadBalancer;

    mergedProps.propertiesToOverride &&
      Object.entries(mergedProps.propertiesToOverride).forEach(([key, value]) => cfnLb.addPropertyOverride(key, value));
  }
}

interface GuHttpsClassicLoadBalancerProps extends Omit<GuClassicLoadBalancerProps, "listeners"> {
  listener?: Partial<LoadBalancerListener>;
}

/**
 * **IMPORTANT**: This construct should **only** be used if you are migrating an existing stack and you need to retain the load balancer.
 * Please use [[`GuHttpsApplicationListener`]] instead of [[`GuHttpsClassicLoadBalancer`]] wherever possible.
 *
 * This construct creates a classic load balancer which accepts HTTPS traffic. It communicates with EC2 instances over port 9000
 * by default. This default can be overridden via the listener prop, for example:
 * ```typescript
 * new GuHttpsClassicLoadBalancer(stack, "HttpsClassicLoadBalancer", {
 *     // other props
 *     listener: {
 *       internalPort: 3000,
 *     },
 *   });
 * ```
 *
 * You can pass a certificate id to this construct via the listener interface, for example:
 * ```typescript
 * new GuHttpsClassicLoadBalancer(stack, "HttpsClassicLoadBalancer", {
 *     // other props
 *     listener: {
 *       sslCertificateId: "certificateId",
 *     },
 *   });
 * ```
 * If certificate id is omitted the library will create a Parameter which allows you to pass in a certificate ARN.
 *
 * For more details on migrating an existing load balancer and general load balancer defaults, see [[`GuClassicLoadBalancer`]].
 */
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
