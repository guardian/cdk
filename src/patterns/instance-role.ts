import { ServicePrincipal } from "@aws-cdk/aws-iam";
import type { GuStack } from "../constructs/core";
import type { GuGetS3ObjectPolicyProps, GuPolicy } from "../constructs/iam";
import {
  GuDescribeEC2Policy,
  GuGetS3ObjectPolicy,
  GuLogShippingPolicy,
  GuParameterStoreReadPolicy,
  GuRole,
  GuSSMRunCommandPolicy,
} from "../constructs/iam";

interface InstanceRoleProps extends GuGetS3ObjectPolicyProps {
  withoutLogShipping?: boolean; // optional to have log shipping added by default, you have to opt out
  additionalPolicies?: GuPolicy[];
}

export class InstanceRole extends GuRole {
  private policies: GuPolicy[];

  constructor(scope: GuStack, id: string, props: InstanceRoleProps) {
    super(scope, id, {
      overrideId: true,
      path: "/",
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    this.policies = [
      new GuSSMRunCommandPolicy(scope),
      new GuGetS3ObjectPolicy(scope, "GetDistributablesPolicy", props),
      new GuDescribeEC2Policy(scope),
      new GuParameterStoreReadPolicy(scope),
      ...(props.withoutLogShipping ? [] : [new GuLogShippingPolicy(scope)]),
      ...(props.additionalPolicies ? props.additionalPolicies : []),
    ];

    this.policies.forEach((p) => p.attachToRole(this));
  }
}
