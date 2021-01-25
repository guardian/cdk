import { ServicePrincipal } from "@aws-cdk/aws-iam";
import type { GuStack } from "../../core";
import type { GuPolicy } from "../policies";
import {
  GuDescribeEC2Policy,
  GuGetDistributablePolicy,
  GuLogShippingPolicy,
  GuParameterStoreReadPolicy,
  GuSSMRunCommandPolicy,
} from "../policies";
import { GuRole } from "../roles";

interface GuInstanceRoleProps {
  withoutLogShipping?: boolean; // optional to have log shipping added by default, you have to opt out
  additionalPolicies?: GuPolicy[];
}

export class GuInstanceRole extends GuRole {
  private policies: GuPolicy[];

  constructor(scope: GuStack, id: string = "InstanceRole", props?: GuInstanceRoleProps) {
    super(scope, id, {
      overrideId: true,
      path: "/",
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    this.policies = [
      new GuSSMRunCommandPolicy(scope),
      new GuGetDistributablePolicy(scope),
      new GuDescribeEC2Policy(scope),
      new GuParameterStoreReadPolicy(scope),
      ...(props?.withoutLogShipping ? [] : [new GuLogShippingPolicy(scope)]),
      ...(props?.additionalPolicies ? props.additionalPolicies : []),
    ];

    this.policies.forEach((p) => p.attachToRole(this));
  }
}
