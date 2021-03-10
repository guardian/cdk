import type { CfnStream, StreamProps } from "@aws-cdk/aws-kinesis";
import { Stream } from "@aws-cdk/aws-kinesis";
import type { GuStack } from "../core";

export interface GuKinesisStreamProps extends StreamProps {
  overrideId?: boolean;
}

export class GuKinesisStream extends Stream {
  constructor(scope: GuStack, id: string, props?: GuKinesisStreamProps) {
    super(scope, id, props);
    const cfnKinesisStream = this.node.defaultChild as CfnStream;
    if (props?.overrideId) cfnKinesisStream.overrideLogicalId(id);
  }
}
