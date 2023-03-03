import type { GuStack } from "../../core";
import type { GuKinesisStream } from "../../kinesis";
import type { GuNoStatementsPolicyProps } from "./base-policy";
import { GuAllowPolicy } from "./base-policy";

export interface GuKinesisPutRecordsPolicyProps extends GuNoStatementsPolicyProps {
  stream: GuKinesisStream;
}

export class GuKinesisPutRecordsPolicy extends GuAllowPolicy {
  constructor(scope: GuStack, id: string, props: GuKinesisPutRecordsPolicyProps) {
    const { stream } = props;
    super(scope, id, { actions: ["kinesis:PutRecords", "kinesis:ListShards"], resources: [stream.streamArn] });
  }
}
