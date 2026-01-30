import { ParameterDataType, ParameterTier, StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import type { GuStack } from "../../core";
import type { GuApplicationLoadBalancer } from "../alb";

export interface WafProps {
  enabled: boolean;
  app?: string;
  loadBalancer?: GuApplicationLoadBalancer;
  ssmParameterArnLogicalId?: string;
}

/**
 * Construct which creates a WAF SSM Parameter
 *
 * This resource is not stateful.
 * @see https://github.com/guardian/cdk/blob/main/docs/stateful-resources.md
 */
export class Waf extends Construct {
  constructor(scope: GuStack, id: string, props: WafProps) {
    const { stage } = scope;
    const { ssmParameterArnLogicalId, loadBalancer, app, enabled } = props;

    super(scope, id);

    if (enabled) {
      if (!loadBalancer) {
        throw new Error("No loadbalancer specified for requested WAF protection.");
      } else {
        const wafParam = new StringParameter(this, "AlbSsmParam", {
          parameterName: `/infosec/waf/services/${stage}/${app}-alb-arn`,
          description: `The ARN of the ALB for ${stage}-${app}.`,
          simpleName: false,
          stringValue: loadBalancer.loadBalancerArn,
          tier: ParameterTier.STANDARD,
          dataType: ParameterDataType.TEXT,
        });

        if (ssmParameterArnLogicalId) {
          scope.overrideLogicalId(wafParam, {
            logicalId: ssmParameterArnLogicalId,
            reason: "Retaining original parameter's logical ID to avoid deployment issues",
          });
        }
      }
    }
  }
}
