import type { ApplicationListenerProps } from "@aws-cdk/aws-elasticloadbalancingv2";
import { ApplicationListener, ApplicationProtocol, ListenerAction } from "@aws-cdk/aws-elasticloadbalancingv2";
import { RegexPattern } from "../../../constants";
import { GuStatefulMigratableConstruct } from "../../../utils/mixin";
import type { GuStack } from "../../core";
import { GuCertificateArnParameter } from "../../core";
import { AppIdentity } from "../../core/identity";
import type { GuMigratingResource } from "../../core/migrating";
import type { GuApplicationTargetGroup } from "./application-target-group";

export interface GuApplicationListenerProps extends ApplicationListenerProps, AppIdentity, GuMigratingResource {}

export class GuApplicationListener extends GuStatefulMigratableConstruct(ApplicationListener) {
  constructor(scope: GuStack, id: string, props: GuApplicationListenerProps) {
    const { app } = props;

    super(scope, AppIdentity.suffixText({ app }, id), { port: 443, protocol: ApplicationProtocol.HTTPS, ...props });

    /*
    AWS::ElasticLoadBalancingV2::Listener resources cannot be tagged.
    Perform the call anyway for consistency across the project.
    Who knows, maybe AWS will support it one day?!
    If so, tests will fail and we can celebrate!
    See https://docs.aws.amazon.com/ARG/latest/userguide/supported-resources.html#services-elasticloadbalancing
     */
    AppIdentity.taggedConstruct({ app }, this);
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
    const { app, certificate, targetGroup } = props;

    if (certificate) {
      const isValid = new RegExp(RegexPattern.ACM_ARN).test(certificate);
      if (!isValid) {
        throw new Error(`${certificate} is not a valid ACM ARN`);
      }
    }

    const mergedProps: GuApplicationListenerProps = {
      port: 443,
      protocol: ApplicationProtocol.HTTPS,
      ...props,
      certificates: [
        {
          certificateArn: certificate ?? new GuCertificateArnParameter(scope, props).valueAsString,
        },
      ],
      defaultAction: ListenerAction.forward([targetGroup]),
    };

    super(scope, AppIdentity.suffixText({ app }, id), mergedProps);

    /*
    AWS::ElasticLoadBalancingV2::Listener resources cannot be tagged.
    Perform the call anyway for consistency across the project.
    Who knows, maybe AWS will support it one day?!
    If so, tests will fail and we can celebrate!
    See https://docs.aws.amazon.com/ARG/latest/userguide/supported-resources.html#services-elasticloadbalancing
     */
    AppIdentity.taggedConstruct({ app }, this);
  }
}
