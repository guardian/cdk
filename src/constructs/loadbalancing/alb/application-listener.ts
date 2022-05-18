import { ApplicationListener, ApplicationProtocol, ListenerAction } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import type { ApplicationListenerProps } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { GuAppAwareConstruct } from "../../../utils/mixin/app-aware-construct";
import type { GuCertificate } from "../../acm";
import type { AppIdentity, GuMigratingResource, GuStack } from "../../core";
import type { GuApplicationTargetGroup } from "./application-target-group";

export interface GuApplicationListenerProps extends ApplicationListenerProps, AppIdentity, GuMigratingResource {}

/**
 * Construct which creates a Listener.
 *
 * This construct should be used in conjunction with [[`GuApplicationLoadBalancer`]] and [[`GuApplicationTargetGroup`]]
 * to route traffic to your application. For more details on these three components, see the
 * [AWS documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html#application-load-balancer-components).
 *
 * In order to inherit an existing Listener, the `migratedFromCloudFormation` prop on your stack must
 * be set to `true`. You must also pass the logical id from your CloudFormation template to this construct via the
 * `existingLogicalId` prop.
 *
 * If you are running an application which only accepts traffic over HTTPS, consider using [[`GuHttpsApplicationListener`]]
 * to reduce the amount of boilerplate needed when configuring your Listener.
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
  certificate: GuCertificate;
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
