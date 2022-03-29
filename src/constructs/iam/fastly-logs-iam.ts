import { AccountPrincipal } from "aws-cdk-lib/aws-iam";
import type { GuStack } from "../core";
import { GuFastlyCustomerIdParameter } from "../core";
import { GuPutS3ObjectsPolicy } from "./policies";
import { GuRole } from "./roles";

export interface GuFastlyLogsIamRoleProps {
  /**
   * S3 bucket name that Fastly will ship logs
   */
  bucketName: string;
  /**
   * Path within the S3 bucket where Fastly will ship logs.
   * @default - '*'
   * If path is not specified, access will be granted to the entire S3 bucket.
   */
  path?: string;
}

// Fastly's AWS account ID is used as an external ID when creating the IAM role
// See https://docs.fastly.com/en/guides/creating-an-aws-iam-role-for-fastly-logging
const FASTLY_AWS_ACCOUNT_ID = "717331877981";

/**
 * Construct which creates the required IAM resources to support Fastly logging to an S3 bucket.
 * Importantly, it does not create a permanent IAM user, which was once a requirement.
 *
 * Specifically, this construct creates a role which can only be assumed in Fastly's AWS account,
 * with an attached policy allowing PUT access to an S3 bucket and path specified in the props.
 *
 * As mentioned, you should configure the S3 bucket used with `bucketName` and the path within
 * that bucket with the optional `path`. `path` defaults to `"*"` i.e. access is given to the
 * entire bucket.
 *
 * ```typescript
 * new GuFastlyLogsIamRole(stack, {
 *   bucketName: "gu-mobile-logs"
 *   path: "fastly/*"
 * })
 * ```
 *
 * See https://docs.fastly.com/en/guides/creating-an-aws-iam-role-for-fastly-logging
 */
export class GuFastlyLogsIamRole extends GuRole {
  constructor(scope: GuStack, props: GuFastlyLogsIamRoleProps) {
    const { path = "*" } = props; // set defaults
    const fastlyCustomerId = GuFastlyCustomerIdParameter.getInstance(scope).valueAsString;
    super(scope, "GuFastlyLogsIamRole", {
      assumedBy: new AccountPrincipal(FASTLY_AWS_ACCOUNT_ID),
      externalIds: [fastlyCustomerId],
    });
    const policy = new GuPutS3ObjectsPolicy(scope, "GuFastlyLogsIamRolePolicy", {
      bucketName: props.bucketName,
      paths: [path],
    });

    policy.attachToRole(this);
  }
}
