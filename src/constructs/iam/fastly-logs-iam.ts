import { AccountPrincipal } from "@aws-cdk/aws-iam";
import type { GuStack } from "../core";
import { GuFastlyCustomerIdParameter } from "../core/parameters/fastly";
import { GuPutS3ObjectsPolicy, GuRole } from "./";

interface GuFastlyLogsIamProps {
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
 * new GuFastlyLogsIam(stack, "FastlyS3Logging", {
 *   bucketName: "gu-mobile-logs"
 *   path: "fastly/*"
 * })
 * ```
 *
 * You may instead wish to create separate roles, rather than a single one.
 *
 * ```typescript
 * new GuFastlyLogsIam(stack, "FastlyS3LoggingMyApp", {
 *   bucketName: "gu-mobile-logs"
 *   path: "fastly/my-app/PROD/*"
 * })
 * ```
 *
 * See https://docs.fastly.com/en/guides/creating-an-aws-iam-role-for-fastly-logging
 */
export class GuFastlyLogsIam {
  constructor(scope: GuStack, id: string, props: GuFastlyLogsIamProps) {
    const policy = new GuPutS3ObjectsPolicy(scope, `${id}IamPolicy`, {
      bucketName: props.bucketName,
      paths: props.path ? [props.path] : undefined,
    });

    const fastlyCustomerId = GuFastlyCustomerIdParameter.getInstance(scope).valueAsString;

    const role = new GuRole(scope, `${id}IamRole`, {
      assumedBy: new AccountPrincipal(FASTLY_AWS_ACCOUNT_ID),
      externalIds: [fastlyCustomerId],
    });

    policy.attachToRole(role);
  }
}
