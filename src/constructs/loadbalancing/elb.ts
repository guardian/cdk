import { Duration } from "aws-cdk-lib";
import { LoadBalancer, LoadBalancingProtocol } from "aws-cdk-lib/aws-elasticloadbalancing";
import type {
  CfnLoadBalancer,
  HealthCheck,
  LoadBalancerListener,
  LoadBalancerProps,
} from "aws-cdk-lib/aws-elasticloadbalancing";
import { GuAppAwareConstruct } from "../../utils/mixin/app-aware-construct";
import { GuArnParameter } from "../core";
import type { AppIdentity, GuStack } from "../core";

interface GuClassicLoadBalancerProps extends Omit<LoadBalancerProps, "healthCheck">, AppIdentity {
  propertiesToOverride?: Record<string, unknown>;
  healthCheck?: Partial<HealthCheck>;
  /**
   * If your CloudFormation does not define the Scheme of your Load Balancer, you must set this boolean to true to avoid
   * resource [replacement](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-elb.html#cfn-ec2-elb-scheme).
   * If a Load Balancer is replaced it is likely to lead to downtime.
   */
  removeScheme?: boolean;
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
export class GuClassicLoadBalancer extends GuAppAwareConstruct(LoadBalancer) {
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

    if (props.removeScheme) {
      cfnLb.addPropertyDeletionOverride("Scheme");
    }

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
    const listenerProps: LoadBalancerListener = { ...GuHttpsClassicLoadBalancer.DefaultListener, ...props.listener };

    const mergedProps: GuClassicLoadBalancerProps = {
      ...props,
      listeners: [
        {
          ...listenerProps,
          sslCertificateArn:
            listenerProps.sslCertificateArn ??
            new GuArnParameter(scope, "CertificateARN", {
              description: "Certificate ARN for ELB",
            }).valueAsString,
        },
      ],
    };

    super(scope, id, mergedProps);
  }
}
