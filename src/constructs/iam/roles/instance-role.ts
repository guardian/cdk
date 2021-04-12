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
  constructor(scope: GuStack, props: GuInstanceRoleProps) {
    super(scope, AppIdentity.suffixText(props, "InstanceRole"), {
      path: "/",
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      // not setting existingLogicalId results in the logicalId always being auto-generated
    });

    const sharedPolicies = [
      GuSSMRunCommandPolicy.getInstance(scope),
      GuDescribeEC2Policy.getInstance(scope),
      ...(props.withoutLogShipping ? [] : [GuLogShippingPolicy.getInstance(scope)]),
    ];

    const policies = [
      ...sharedPolicies,
      new GuGetDistributablePolicy(scope, props),
      new GuParameterStoreReadPolicy(scope, props),
      ...(props.additionalPolicies ? props.additionalPolicies : []),
    ];

    policies.forEach((p) => p.attachToRole(this));

    AppIdentity.taggedConstruct(props, this);
  }
}
