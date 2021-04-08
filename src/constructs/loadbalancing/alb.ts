import type {
  ApplicationListenerProps,
  ApplicationLoadBalancerProps,
  ApplicationTargetGroupProps,
  CfnLoadBalancer,
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
import { GuMigratingResource } from "../core/migrating";
import type { GuStatefulConstruct } from "../core/migrating";

interface GuApplicationLoadBalancerProps extends ApplicationLoadBalancerProps, GuMigratingResource {}

export class GuApplicationLoadBalancer extends ApplicationLoadBalancer implements GuStatefulConstruct {
  public readonly isStatefulConstruct: true;
  constructor(scope: GuStack, id: string, props: GuApplicationLoadBalancerProps) {
    super(scope, id, { deletionProtection: true, ...props });
    this.isStatefulConstruct = true;
    GuMigratingResource.setLogicalId(this, scope, props);

    const cfnLb = this.node.defaultChild as CfnLoadBalancer;
    cfnLb.addPropertyDeletionOverride("Type");
  }
}

export interface GuApplicationTargetGroupProps extends ApplicationTargetGroupProps, GuMigratingResource {}

export class GuApplicationTargetGroup extends ApplicationTargetGroup implements GuStatefulConstruct {
  static DefaultHealthCheck = {
    path: "/healthcheck",
    protocol: Protocol.HTTP,
    healthyThresholdCount: 2,
    unhealthyThresholdCount: 5,
    interval: Duration.seconds(30),
    timeout: Duration.seconds(10),
  };

  public readonly isStatefulConstruct: true;

  constructor(scope: GuStack, id: string, props: GuApplicationTargetGroupProps) {
    const mergedProps = {
      ...props,
      healthCheck: { ...GuApplicationTargetGroup.DefaultHealthCheck, ...props.healthCheck },
    };

    super(scope, id, mergedProps);
    this.isStatefulConstruct = true;
    GuMigratingResource.setLogicalId(this, scope, props);
  }
}

export interface GuApplicationListenerProps extends ApplicationListenerProps, GuMigratingResource {}

export class GuApplicationListener extends ApplicationListener implements GuStatefulConstruct {
  public readonly isStatefulConstruct: true;

  constructor(scope: GuStack, id: string, props: GuApplicationListenerProps) {
    super(scope, id, { port: 443, protocol: ApplicationProtocol.HTTPS, ...props });
    this.isStatefulConstruct = true;
    GuMigratingResource.setLogicalId(this, scope, props);
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
