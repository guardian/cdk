import type { ApplicationListenerProps, CfnListener } from "@aws-cdk/aws-elasticloadbalancingv2";
import { ApplicationListener, ApplicationProtocol, ListenerAction } from "@aws-cdk/aws-elasticloadbalancingv2";
import { RegexPattern } from "../../../constants";
import type { GuStack } from "../../core";
import { GuCertificateArnParameter } from "../../core";
import type { AppIdentity } from "../../core/identity";
import type { GuApplicationTargetGroup } from "./application-target-group";

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
