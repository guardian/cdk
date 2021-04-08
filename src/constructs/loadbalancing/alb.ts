import type {
  ApplicationListenerProps,
  ApplicationLoadBalancerProps,
  ApplicationTargetGroupProps,
  CfnListener,
  CfnLoadBalancer,
  CfnTargetGroup,
} from "@aws-cdk/aws-elasticloadbalancingv2";
import {
  ApplicationListener,
  ApplicationLoadBalancer,
  ApplicationProtocol,
  ApplicationTargetGroup,
  ListenerAction,
  Protocol,
} from "@aws-cdk/aws-elasticloadbalancingv2";
import { Duration } from "@aws-cdk/core";
import { RegexPattern } from "../../constants";
import type { GuStack } from "../core";
import { GuCertificateArnParameter } from "../core";
import type { AppIdentity } from "../core/identity";

interface GuApplicationLoadBalancerProps extends ApplicationLoadBalancerProps {
  overrideId?: boolean;
}

export class GuApplicationLoadBalancer extends ApplicationLoadBalancer {
  constructor(scope: GuStack, id: string, props: GuApplicationLoadBalancerProps) {
    super(scope, id, { deletionProtection: true, ...props });

    const cfnLb = this.node.defaultChild as CfnLoadBalancer;

    if (props.overrideId || (scope.migratedFromCloudFormation && props.overrideId !== false))
      cfnLb.overrideLogicalId(id);

    cfnLb.addPropertyDeletionOverride("Type");
  }
}

export interface GuApplicationTargetGroupProps extends ApplicationTargetGroupProps {
  overrideId?: boolean;
}

export class GuApplicationTargetGroup extends ApplicationTargetGroup {
  static DefaultHealthCheck = {
    path: "/healthcheck",
    protocol: Protocol.HTTP,
    healthyThresholdCount: 2,
    unhealthyThresholdCount: 5,
    interval: Duration.seconds(30),
    timeout: Duration.seconds(10),
  };

  constructor(scope: GuStack, id: string, props: GuApplicationTargetGroupProps) {
    const mergedProps = {
      ...props,
      healthCheck: { ...GuApplicationTargetGroup.DefaultHealthCheck, ...props.healthCheck },
    };

    super(scope, id, mergedProps);

    if (mergedProps.overrideId || (scope.migratedFromCloudFormation && mergedProps.overrideId !== false))
      (this.node.defaultChild as CfnTargetGroup).overrideLogicalId(id);
  }
}

export interface GuApplicationListenerProps extends ApplicationListenerProps {
  overrideId?: boolean;
}

export class GuApplicationListener extends ApplicationListener {
  constructor(scope: GuStack, id: string, props: GuApplicationListenerProps) {
    super(scope, id, { port: 443, protocol: ApplicationProtocol.HTTPS, ...props });

    if (props.overrideId || (scope.migratedFromCloudFormation && props.overrideId !== false))
      (this.node.defaultChild as CfnListener).overrideLogicalId(id);
  }
}

export interface GuHttpsApplicationListenerProps
  extends Omit<GuApplicationListenerProps, "defaultAction" | "certificates">,
    AppIdentity {
  targetGroup: GuApplicationTargetGroup;
  certificate?: string;
}

export class GuHttpsApplicationListener extends ApplicationListener {
  constructor(scope: GuStack, id: string, props: GuHttpsApplicationListenerProps) {
    if (props.certificate) {
      const isValid = new RegExp(RegexPattern.ACM_ARN).test(props.certificate);
      if (!isValid) {
        throw new Error(`${props.certificate} is not a valid ACM ARN`);
      }
    }

    const mergedProps: GuApplicationListenerProps = {
      port: 443,
      protocol: ApplicationProtocol.HTTPS,
      ...props,
      certificates: [
        {
          certificateArn: props.certificate ?? new GuCertificateArnParameter(scope, props).valueAsString,
        },
      ],
      defaultAction: ListenerAction.forward([props.targetGroup]),
    };

    super(scope, id, mergedProps);
  }
}
