import type { GuStack } from "../../../constructs/core";
import type { GuNoStatementsPolicyProps } from "../../../constructs/iam/policies/base-policy";
import { GuAllowPolicy } from "../../../constructs/iam/policies/base-policy";
import type { GuKinesisStream } from "../../../constructs/kinesis";

export interface GuKinesisPutRecordsPolicyProps extends GuNoStatementsPolicyProps {
  stream: GuKinesisStream;
}

export class GuKinesisPutRecordsPolicyExperimental extends GuAllowPolicy {
  constructor(scope: GuStack, id: string, props: GuKinesisPutRecordsPolicyProps) {
    const { stream } = props;
    super(scope, id, { actions: ["kinesis:PutRecords", "kinesis:ListShards"], resources: [stream.streamArn] });
  }
}
