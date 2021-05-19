import { ServicePrincipal } from "@aws-cdk/aws-iam";
import { AppIdentity } from "../../core/identity";
import {
  GuDescribeEC2Policy,
  GuGetDistributablePolicy,
  GuLogShippingPolicy,
  GuParameterStoreReadPolicy,
  GuSSMRunCommandPolicy,
} from "../policies";
import { GuRole } from "./roles";
import type { GuStack } from "../../core";
import type { GuPolicy } from "../policies";

export interface GuInstanceRoleProps {
  withoutLogShipping?: boolean;
  additionalPolicies?: GuPolicy[];
}

export type GuInstanceRolePropsWithApp = GuInstanceRoleProps & AppIdentity;

/**
 * Creates an IAM role with common policies that are needed by most Guardian applications.
 *
 * More specifically:
 * 1. Allows for `ssh` access to an EC2 instance via [ssm-scala](https://github.com/guardian/ssm-scala) (instead of standard `ssh`).
 * 2. Allows EC2 instances to communicate with Wazuh, for security monitoring.
 * 3. Allows EC2 instances to download an artifact from AWS S3, for application deployment.
 * 4. Allows EC2 instances to download private configuration from AWS Parameter Store.
 * 5. Allows EC2 instances to write logs into our central ELK stack via Kinesis.
 *
 * If additional IAM permissions are required, create custom policies and pass them in via the `additionalPolicies` prop.
 *
 * If log shipping is not required, opt out by setting the `withoutLogShipping` prop to `true`.
 */
export class GuInstanceRole extends GuRole {
  constructor(scope: GuStack, props: GuInstanceRolePropsWithApp) {
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
