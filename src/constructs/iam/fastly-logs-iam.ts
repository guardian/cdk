import { AccountPrincipal } from "@aws-cdk/aws-iam";
import type { GuStack } from "../core";
import { GuFastlyCustomerIdParameter } from "../core/parameters/fastly";
import { GuPutS3ObjectsPolicy, GuRole } from "./";

interface GuFastlyLogsIamProps {
  bucketName: string;
  path?: string;
}

// Fastly's AWS account ID is used as an external ID when creating the IAM role
// See https://docs.fastly.com/en/guides/creating-an-aws-iam-role-for-fastly-logging
const FASTLY_AWS_ACCOUNT_ID = "717331877981";

/*
TODO: docs
 */
export class GuFastlyLogsIam {
  constructor(scope: GuStack, id: string, props: GuFastlyLogsIamProps) {
    const policy = new GuPutS3ObjectsPolicy(scope, `${id}FastlyLogsIamPolicy`, {
      bucketName: props.bucketName,
      paths: props.path ? [props.path] : undefined,
    });

    const fastlyCustomerId = GuFastlyCustomerIdParameter.getInstance(scope).valueAsString;

    const role = new GuRole(scope, `${id}FastlyLogsIamRole`, {
      assumedBy: new AccountPrincipal(FASTLY_AWS_ACCOUNT_ID),
      externalIds: [fastlyCustomerId],
    });

    policy.attachToRole(role);
  }
}
