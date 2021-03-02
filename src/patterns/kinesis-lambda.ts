import { Stream } from "@aws-cdk/aws-kinesis";
import { StartingPosition } from "@aws-cdk/aws-lambda";
import { KinesisEventSource } from "@aws-cdk/aws-lambda-event-sources";
import type { GuLambdaErrorPercentageMonitoringProps, NoMonitoring } from "../constructs/cloudwatch";
import type { GuStack } from "../constructs/core";
import { GuKinesisStream } from "../constructs/kinesis";
import type { GuFunctionProps } from "../constructs/lambda";
import { GuLambdaFunction } from "../constructs/lambda";

export interface ExistingKinesisStream {
  logicalIdFromCloudFormation?: string;
  externalKinesisStreamName?: string;
}

export interface GuKinesisLambdaProps extends Omit<GuFunctionProps, "rules" | "apis" | "errorPercentageMonitoring"> {
  monitoringConfiguration: NoMonitoring | GuLambdaErrorPercentageMonitoringProps;
  existingKinesisStream?: ExistingKinesisStream;
}

export class GuKinesisLambda extends GuLambdaFunction {
  constructor(scope: GuStack, id: string, props: GuKinesisLambdaProps) {
    super(scope, id, {
      ...props,
      errorPercentageMonitoring: props.monitoringConfiguration.noMonitoring ? undefined : props.monitoringConfiguration,
    });
    const streamId = props.existingKinesisStream?.logicalIdFromCloudFormation ?? "KinesisStream";
    const kinesisStream = props.existingKinesisStream?.externalKinesisStreamName
      ? Stream.fromStreamArn(
          scope,
          streamId,
          `arn:aws:sns:${scope.region}:${scope.account}:${props.existingKinesisStream.externalKinesisStreamName}`
        )
      : new GuKinesisStream(scope, streamId, {
          overrideId: !!props.existingKinesisStream?.logicalIdFromCloudFormation,
        });
    this.addEventSource(new KinesisEventSource(kinesisStream, { startingPosition: StartingPosition.LATEST }));
  }
}
