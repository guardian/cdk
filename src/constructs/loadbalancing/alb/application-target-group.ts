import { Annotations, Duration } from "aws-cdk-lib";
import { ApplicationProtocol, ApplicationTargetGroup, Protocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import type { ApplicationTargetGroupProps, HealthCheck } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { GuAppAwareConstruct } from "../../../utils/mixin/app-aware-construct";
import { WithStaticLogicalId } from "../../../utils/mixin/with-static-logical-id";
import type { AppIdentity, GuMigratingResource, GuStack } from "../../core";

export interface GuApplicationTargetGroupProps extends ApplicationTargetGroupProps, AppIdentity, GuMigratingResource {}

/**
 * Construct which creates a Target Group.
 *
 * This construct should be used in conjunction with [[`GuApplicationLoadBalancer`]] and [[`GuApplicationListener`]]
 * to route traffic to your application. For more details on these three components, see the
 * [AWS documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html#application-load-balancer-components).
 *
 * In order to inherit an existing Target Group, the `migratedFromCloudFormation` prop on your stack must
 * be set to `true`. You must also pass the logical id from your CloudFormation template to this construct via the
 * `existingLogicalId` prop.
 *
 * By default, Target Groups created via this construct will perform a healthcheck against `/healthcheck` on your application's
 * traffic port (as specified via the `port` prop). All healthcheck defaults can be overridden via the `healthcheck` prop.
 *
 * For example, to use `/test` for the healthcheck path use:
 *
 * ```typescript
 * new GuApplicationTargetGroup(stack, "TargetGroup", {
 *     // other props
 *     healthCheck: {
 *       path: "/test",
 *     },
 *   });
 * ```
 */
export class GuApplicationTargetGroup extends WithStaticLogicalId(GuAppAwareConstruct(ApplicationTargetGroup)) {
  private static defaultHealthcheckInterval = Duration.seconds(10);
  private static defaultHealthcheckTimeout = Duration.seconds(5);

  static DefaultHealthCheck: HealthCheck = {
    path: "/healthcheck",
    protocol: Protocol.HTTP,
    healthyThresholdCount: 5,
    unhealthyThresholdCount: 2,
    interval: GuApplicationTargetGroup.defaultHealthcheckInterval,
    timeout: GuApplicationTargetGroup.defaultHealthcheckTimeout,
  };

  constructor(scope: GuStack, id: string, props: GuApplicationTargetGroupProps) {
    const mergedProps: ApplicationTargetGroupProps = {
      protocol: ApplicationProtocol.HTTP, // We terminate HTTPS at the load balancer level, so load balancer to ASG/EC2 traffic can be over HTTP
      deregistrationDelay: Duration.seconds(30),
      ...props,
      healthCheck: { ...GuApplicationTargetGroup.DefaultHealthCheck, ...props.healthCheck },
    };

    super(scope, id, mergedProps);

    const interval = mergedProps.healthCheck?.interval ?? GuApplicationTargetGroup.defaultHealthcheckInterval;
    const timeout = mergedProps.healthCheck?.timeout ?? GuApplicationTargetGroup.defaultHealthcheckTimeout;

    /*
    The healthcheck `timeout` must be lower than `interval`
    See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-elb-health-check.html#cfn-elb-healthcheck-timeout
     */
    if (timeout.toSeconds() >= interval.toSeconds()) {
      const message = `Illegal healthcheck configuration: timeout (${timeout.toSeconds()}) must be lower than interval (${interval.toSeconds()})`;
      Annotations.of(this).addError(message); // adds a useful message to the console to aid debugging
      throw new Error(message);
    }
  }
}
