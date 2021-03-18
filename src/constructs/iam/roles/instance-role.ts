import { ServicePrincipal } from "@aws-cdk/aws-iam";
import type { GuStack } from "../../core";
import { AppIdentity } from "../../core/identity";
import type { GuPolicy } from "../policies";
import {
  GuDescribeEC2Policy,
  GuGetDistributablePolicy,
  GuLogShippingPolicy,
  GuParameterStoreReadPolicy,
  GuSSMRunCommandPolicy,
} from "../policies";
import { GuRole } from "./roles";

interface GuInstanceRoleProps extends AppIdentity {
  withoutLogShipping?: boolean; // optional to have log shipping added by default, you have to opt out
  additionalPolicies?: GuPolicy[];
}

export class GuInstanceRole extends GuRole {
  private policies: GuPolicy[];

  // eslint-disable-next-line custom-rules/valid-constructors -- TODO be better
  constructor(scope: GuStack, props: GuInstanceRoleProps) {
    super(scope, AppIdentity.suffixText(props, "InstanceRole"), {
      overrideId: true,
      path: "/",
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    this.policies = [
      GuSSMRunCommandPolicy.getInstance(scope),
      new GuGetDistributablePolicy(scope, props),
      new GuDescribeEC2Policy(scope),
      new GuParameterStoreReadPolicy(scope, props),
      ...(props.withoutLogShipping ? [] : [GuLogShippingPolicy.getInstance(scope)]),
      ...(props.additionalPolicies ? props.additionalPolicies : []),
    ];

    this.policies.forEach((p) => p.attachToRole(this));

    AppIdentity.taggedConstruct(props, this);
  }
}
