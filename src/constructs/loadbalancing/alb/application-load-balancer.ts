import type { ApplicationLoadBalancerProps, CfnLoadBalancer } from "@aws-cdk/aws-elasticloadbalancingv2";
import { ApplicationLoadBalancer } from "@aws-cdk/aws-elasticloadbalancingv2";
import { GuStatefulMigratableConstruct } from "../../../utils/mixin";
import type { GuStack } from "../../core";
import { AppIdentity } from "../../core/identity";
import type { GuMigratingResource } from "../../core/migrating";

interface GuApplicationLoadBalancerProps extends ApplicationLoadBalancerProps, AppIdentity, GuMigratingResource {}

export class GuApplicationLoadBalancer extends GuStatefulMigratableConstruct(ApplicationLoadBalancer) {
  constructor(scope: GuStack, id: string, props: GuApplicationLoadBalancerProps) {
    const { app } = props;

    super(scope, AppIdentity.suffixText({ app }, id), { deletionProtection: true, ...props });

    const cfnLb = this.node.defaultChild as CfnLoadBalancer;
    cfnLb.addPropertyDeletionOverride("Type");

    AppIdentity.taggedConstruct({ app }, this);
  }
}
