import { ApplicationListener, ApplicationProtocol, ListenerAction } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import type { ApplicationListenerProps } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { GuAppAwareConstruct } from "../../../utils/mixin/app-aware-construct";
import type { GuCertificate } from "../../acm";
import type { AppIdentity, GuStack } from "../../core";
import type { GuApplicationTargetGroup } from "./application-target-group";

export interface GuApplicationListenerProps extends ApplicationListenerProps, AppIdentity { }

/**
 * Construct which creates a Listener.
 *
 * This construct should be used in conjunction with [[`GuApplicationLoadBalancer`]] and [[`GuApplicationTargetGroup`]]
 * to route traffic to your application. For more details on these three components, see the
 * [AWS documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html#application-load-balancer-components).
 *
 * If you are running an application which only accepts traffic over HTTPS, consider using [[`GuHttpsApplicationListener`]]
 * to reduce the amount of boilerplate needed when configuring your Listener.
 *
 * This resource is stateful.
 * @see https://github.com/guardian/cdk/blob/main/docs/stateful-resources.md
 */
export class GuApplicationListener extends GuAppAwareConstruct(ApplicationListener) {
  constructor(scope: GuStack, id: string, props: GuApplicationListenerProps) {
    super(scope, id, { port: 443, protocol: ApplicationProtocol.HTTPS, ...props });
  }
}

export interface GuHttpsApplicationListenerProps
  extends Omit<GuApplicationListenerProps, "defaultAction" | "certificates">,
  AppIdentity {
  targetGroup: GuApplicationTargetGroup;
  certificate?: GuCertificate;
}

/**
 * Construct which creates a Listener which accepts HTTPS traffic.
 *
 * You must pass a [[`GuCertificate`]] to this Listener via the `certificate` prop.
 *
 * For general details about Listeners, see [[`GuApplicationListener`]].
 */
export class GuHttpsApplicationListener extends GuAppAwareConstruct(ApplicationListener) {
  constructor(scope: GuStack, id: string, props: GuHttpsApplicationListenerProps) {
    const { certificate, targetGroup } = props;

    const mergedProps: GuApplicationListenerProps = {
      port: typeof certificate === undefined ? 8080 : 443,
      protocol: typeof certificate === undefined ? ApplicationProtocol.HTTP : ApplicationProtocol.HTTPS,
      ...props,
      certificates: typeof certificate === "undefined" ? [] : [
        {
          certificateArn: certificate.certificateArn,
        },
      ],
      defaultAction: ListenerAction.forward([targetGroup]),
    };

    super(scope, id, mergedProps);
  }
}
