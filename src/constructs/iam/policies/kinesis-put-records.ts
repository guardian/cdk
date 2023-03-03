import { GuStack } from "../../core";
import { GuKinesisStream } from "../../kinesis";
import { GuAllowPolicy, GuNoStatementsPolicyProps } from "./base-policy";

export interface GuKinesisPutRecordsPolicyProps extends GuNoStatementsPolicyProps {
  stream: GuKinesisStream;
}

export class GuKinesisPutRecordsPolicy extends GuAllowPolicy {
  constructor(scope: GuStack, id: string, props: GuKinesisPutRecordsPolicyProps) {
    const { stream } = props;
    super(scope, id, { actions: ["kinesis:PutRecords", "kinesis:ListShards"], resources: [stream.streamArn] });
  }
}
