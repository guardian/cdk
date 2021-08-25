import  { AccountPrincipal } from "@aws-cdk/aws-iam";
import type { GuStack } from "../constructs/core";
import { GuFastlyCustomerIdParameter } from "../constructs/core/parameters/fastly";
import { GuPutS3ObjectsPolicy, GuRole } from "../constructs/iam";

interface GuFastlyLogsIamProps {
  bucketName: string;
  path?: string;
}

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
      assumedBy: new AccountPrincipal("717331877981"), //TODO: make this configurable? this is public but managing changes will be easier in configurable
      externalIds: [fastlyCustomerId],
    });

    policy.attachToRole(role);
  }
}
