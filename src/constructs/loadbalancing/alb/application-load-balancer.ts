import { CfnOutput } from "aws-cdk-lib";
import { ApplicationLoadBalancer } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import type { ApplicationLoadBalancerProps, CfnLoadBalancer } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { GuAppAwareConstruct } from "../../../utils/mixin/app-aware-construct";
import type { AppIdentity, GuStack } from "../../core";

interface GuApplicationLoadBalancerProps extends ApplicationLoadBalancerProps, AppIdentity {
  /**
   * If your CloudFormation does not define the Type of your Load Balancer, you must set this boolean to true to avoid
   * resource [replacement](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-loadbalancer.html#cfn-elasticloadbalancingv2-loadbalancer-type).
   * If a Load Balancer is replaced it is likely to lead to downtime.
   */
  removeType?: boolean;
}

/**
 * Construct which creates an Application Load Balancer.
 *
 * This construct should be used in conjunction with [[`GuApplicationListener`]] and [[`GuApplicationTargetGroup`]]
 * to route traffic to your application. For more details on these three components, see the
 * [AWS documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html#application-load-balancer-components).
 *
 * In order to inherit an existing Application Load Balancer, the `migratedFromCloudFormation` prop on your stack must
 * be set to `true`. You must also pass the logical id from your CloudFormation template to this construct via the
 * `existingLogicalId` prop.
 */
export class GuApplicationLoadBalancer extends GuAppAwareConstruct(ApplicationLoadBalancer) {
  constructor(scope: GuStack, id: string, props: GuApplicationLoadBalancerProps) {
    super(scope, id, { deletionProtection: true, ...props });

    if (props.removeType) {
      const cfnLb = this.node.defaultChild as CfnLoadBalancer;
      cfnLb.addPropertyDeletionOverride("Type");
    }

    new CfnOutput(this, `${this.idWithApp}-DnsName`, {
      description: `DNS entry for ${this.idWithApp}`,
      value: this.loadBalancerDnsName,
    }).overrideLogicalId(`${this.idWithApp}DnsName`);
  }
}
