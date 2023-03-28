import { AccountPrincipal } from "aws-cdk-lib/aws-iam";
import { FASTLY_AWS_ACCOUNT_ID } from "../../../../constants/fastly-aws-account-id";
import type { GuStack } from "../../../../constructs/core";
import { GuFastlyCustomerIdParameter } from "../../../../constructs/core";
import { GuRole } from "../../../../constructs/iam";
import type { GuKinesisStream } from "../../../../constructs/kinesis";
import { GuKinesisPutRecordsPolicyExperimental } from "../../policies/kinesis-put-records";

export interface GuFastlyKinesisLogRoleProps {
  /**
   * The Kinesis stream into which Fastly will put records
   */
  stream: GuKinesisStream;
  /**
   * Name of the IAM role
   */
  roleName?: string;
}

/**
 * A construct to create an IAM Role for Fastly to assume in order to write to a
 * specific Kinesis stream.
 *
 * In order to use this construct, an SSM parameter named `/account/external/fastly/customer.id`
 * needs to exist in the AWS account's parameter store, and the value should be
 * the Guardian's Fastly customer id.
 *
 */
export class GuFastlyKinesisLogRoleExperimental extends GuRole {
  constructor(scope: GuStack, id: string, props: GuFastlyKinesisLogRoleProps) {
    const fastlyCustomerId = GuFastlyCustomerIdParameter.getInstance(scope).valueAsString;
    const { roleName, stream } = props;

    super(scope, id, {
      roleName,
      assumedBy: new AccountPrincipal(FASTLY_AWS_ACCOUNT_ID),
      externalIds: [fastlyCustomerId],
    });

    const policy = new GuKinesisPutRecordsPolicyExperimental(scope, "GuKinesisPutRecordsPolicy", {
      stream,
    });

    policy.attachToRole(this);
  }
}
