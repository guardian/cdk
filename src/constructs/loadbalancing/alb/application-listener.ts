import { ApplicationListener, ApplicationProtocol, ListenerAction } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import type { ApplicationListenerProps } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import type { GuCertificate } from "../../acm";
import type { GuApp } from "../../core";
import type { GuApplicationTargetGroup } from "./application-target-group";

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
export class GuApplicationListener extends ApplicationListener {
  constructor(scope: GuApp, id: string, props: ApplicationListenerProps) {
    super(scope, id, { port: 443, protocol: ApplicationProtocol.HTTPS, ...props });
  }
}

export interface GuHttpsApplicationListenerProps
  extends Omit<ApplicationListenerProps, "defaultAction" | "certificates"> {
  targetGroup: GuApplicationTargetGroup;
  certificate: GuCertificate;
}

/**
 * Construct which creates a Listener which accepts HTTPS traffic.
 *
 * You must pass a [[`GuCertificate`]] to this Listener via the `certificate` prop.
 *
 * For general details about Listeners, see [[`GuApplicationListener`]].
 */
export class GuHttpsApplicationListener extends ApplicationListener {
  constructor(scope: GuApp, id: string, props: GuHttpsApplicationListenerProps) {
    const { certificate, targetGroup } = props;

    const mergedProps: ApplicationListenerProps = {
      port: 443,
      protocol: ApplicationProtocol.HTTPS,
      ...props,
      certificates: [
        {
          certificateArn: certificate.certificateArn,
        },
      ],
      defaultAction: ListenerAction.forward([targetGroup]),
    };

    super(scope, id, mergedProps);
  }
}
