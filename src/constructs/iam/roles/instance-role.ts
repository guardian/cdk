import { ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { GuAppAwareConstruct } from "../../../utils/mixin/app-aware-construct";
import type { AppIdentity, GuStack } from "../../core";
import {
  GuDescribeEC2Policy,
  GuGetDistributablePolicy,
  GuLogShippingPolicy,
  GuParameterStoreReadPolicy,
} from "../policies";
import type { GuPolicy } from "../policies";
import { GuSsmSshPolicy } from "../policies/ssm-ssh";
import { GuRole } from "./roles";

export interface GuInstanceRoleProps {
  /**
   * By default, instances are given permissions to write to Kinesis. Set to
   * 'true' to prevent this. Note, disabling will prevent not just application
   * logs being shipped but also anything else - for example, automatic log
   * shipping of Cloud Init and other logs by the cdk-base role in your AMI.
   */
  withoutLogShipping?: boolean;

  additionalPolicies?: GuPolicy[];
}

export type GuInstanceRolePropsWithApp = GuInstanceRoleProps & AppIdentity;

/**
 * Creates an IAM role with common policies that are needed by most Guardian applications.
 *
 * More specifically:
 * 1. Allows for `ssh` access to an EC2 instance via [ssm-scala](https://github.com/guardian/ssm-scala) (instead of standard `ssh`).
 * 2. Allows EC2 instances to download an artifact from AWS S3, for application deployment.
 * 3. Allows EC2 instances to download private configuration from AWS Parameter Store. See [[`GuParameterStoreReadPolicy`]]
 * for specific details.
 * 4. Allows EC2 instances to write logs into our central ELK stack via Kinesis.
 *
 * If additional IAM permissions are required, create custom policies and pass them in via the `additionalPolicies` prop.
 *
 * If log shipping is not required, opt out by setting the `withoutLogShipping` prop to `true`.
 */
export class GuInstanceRole extends GuAppAwareConstruct(GuRole) {
  constructor(scope: GuStack, props: GuInstanceRolePropsWithApp) {
    super(scope, "InstanceRole", {
      path: "/",
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      ...props,
    });

    const sharedPolicies = [
      GuSsmSshPolicy.getInstance(scope),
      GuDescribeEC2Policy.getInstance(scope),
      ...(props.withoutLogShipping ? [] : [GuLogShippingPolicy.getInstance(scope)]),
    ];

    const policies = [
      ...sharedPolicies,
      new GuGetDistributablePolicy(scope, props),
      new GuParameterStoreReadPolicy(scope, props),
      ...(props.additionalPolicies ?? []),
    ];

    policies.forEach((p) => p.attachToRole(this));
  }
}
