import type { ApplicationTargetGroupProps } from "@aws-cdk/aws-elasticloadbalancingv2";
import { ApplicationProtocol, ApplicationTargetGroup, Protocol } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Duration } from "@aws-cdk/core";
import { GuStatefulMigratableConstruct } from "../../../utils/mixin";
import type { GuStack } from "../../core";
import { AppIdentity } from "../../core/identity";
import type { GuMigratingResource } from "../../core/migrating";

export interface GuApplicationTargetGroupProps extends ApplicationTargetGroupProps, AppIdentity, GuMigratingResource {}

export class GuApplicationTargetGroup extends GuStatefulMigratableConstruct(ApplicationTargetGroup) {
  static DefaultHealthCheck = {
    path: "/healthcheck",
    protocol: Protocol.HTTP,
    healthyThresholdCount: 2,
    unhealthyThresholdCount: 5,
    interval: Duration.seconds(30),
    timeout: Duration.seconds(10),
  };

  constructor(scope: GuStack, id: string, props: GuApplicationTargetGroupProps) {
    const { app } = props;

    const mergedProps = {
      protocol: ApplicationProtocol.HTTP, // We terminate HTTPS at the load balancer level, so load balancer to ASG/EC2 traffic can be over HTTP
      ...props,
      healthCheck: { ...GuApplicationTargetGroup.DefaultHealthCheck, ...props.healthCheck },
    };

    super(scope, AppIdentity.suffixText({ app }, id), mergedProps);

    AppIdentity.taggedConstruct({ app }, this);
  }
}
