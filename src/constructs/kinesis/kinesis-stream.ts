import { Stream } from "aws-cdk-lib/aws-kinesis";
import type { StreamProps } from "aws-cdk-lib/aws-kinesis";
import type { GuApp } from "../core";

export type GuKinesisStreamProps = StreamProps;

/**
 * Construct which creates a Kinesis stream.
 *
 * This resource is stateful.
 * @see https://github.com/guardian/cdk/blob/main/docs/stateful-resources.md
 */
export class GuKinesisStream extends Stream {
  constructor(scope: GuApp, id: string, props?: GuKinesisStreamProps) {
    super(scope, id, props);
  }
}
