import type { ApplicationLoadBalancerProps, CfnLoadBalancer } from "@aws-cdk/aws-elasticloadbalancingv2";
import { ApplicationLoadBalancer } from "@aws-cdk/aws-elasticloadbalancingv2";
import { GuStatefulMigratableConstruct } from "../../../utils/mixin";
import type { GuStack } from "../../core";
import { AppIdentity } from "../../core/identity";
import type { GuMigratingResource } from "../../core/migrating";

interface GuApplicationLoadBalancerProps extends ApplicationLoadBalancerProps, AppIdentity, GuMigratingResource {}

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
export class GuApplicationLoadBalancer extends GuStatefulMigratableConstruct(ApplicationLoadBalancer) {
  constructor(scope: GuStack, id: string, props: GuApplicationLoadBalancerProps) {
    const { app } = props;

    super(scope, AppIdentity.suffixText({ app }, id), { deletionProtection: true, ...props });

    const cfnLb = this.node.defaultChild as CfnLoadBalancer;
    cfnLb.addPropertyDeletionOverride("Type");

    AppIdentity.taggedConstruct({ app }, this);
  }
}
