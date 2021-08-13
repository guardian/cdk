import { ApplicationProtocol, ApplicationTargetGroup, Protocol } from "@aws-cdk/aws-elasticloadbalancingv2";
import type { ApplicationTargetGroupProps } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Duration } from "@aws-cdk/core";
import { GuStatefulMigratableConstruct } from "../../../utils/mixin";
import type { GuStack } from "../../core";
import { AppIdentity } from "../../core/identity";
import type { GuMigratingResource } from "../../core/migrating";

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
export class GuApplicationTargetGroup extends GuStatefulMigratableConstruct(ApplicationTargetGroup) {
  static DefaultHealthCheck = {
    path: "/healthcheck",
    protocol: Protocol.HTTP,
    healthyThresholdCount: 5,
    unhealthyThresholdCount: 2,
    interval: Duration.seconds(10),
    timeout: Duration.seconds(10),
  };

  constructor(scope: GuStack, id: string, props: GuApplicationTargetGroupProps) {
    const { app } = props;

    const mergedProps = {
      protocol: ApplicationProtocol.HTTP, // We terminate HTTPS at the load balancer level, so load balancer to ASG/EC2 traffic can be over HTTP
      deregistrationDelay: Duration.seconds(30),
      ...props,
      healthCheck: { ...GuApplicationTargetGroup.DefaultHealthCheck, ...props.healthCheck },
    };

    super(scope, AppIdentity.suffixText({ app }, id), mergedProps);

    AppIdentity.taggedConstruct({ app }, this);
  }
}
