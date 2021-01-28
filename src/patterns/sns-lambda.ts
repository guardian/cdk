import { SnsEventSource } from "@aws-cdk/aws-lambda-event-sources";
import { Topic } from "@aws-cdk/aws-sns";
import type { LambdaErrorPercentageMonitoring } from "../constructs/cloudwatch/lambda-alarms";
import type { NoMonitoring } from "../constructs/cloudwatch/no-monitoring";
import type { GuStack } from "../constructs/core";
import type { GuFunctionProps } from "../constructs/lambda";
import { GuLambdaFunction } from "../constructs/lambda";
import { GuSnsTopic } from "../constructs/sns/sns-topic";

interface ExistingSnsTopic {
  logicalIdFromCloudFormation?: string; // Allows us to inherit an SNS topic which has already been created via a CloudFormation stack
  externalTopicName?: string; // Allows us to link the lambda to an SNS topic owned by a different stack (or created outside of CloudFormation)
}

interface GuSnsLambdaProps extends Omit<GuFunctionProps, "rules" | "apis"> {
  monitoringConfiguration: NoMonitoring | LambdaErrorPercentageMonitoring;
  existingSnsTopic?: ExistingSnsTopic;
}

export class GuSnsLambda extends GuLambdaFunction {
  constructor(scope: GuStack, id: string, props: GuSnsLambdaProps) {
    super(scope, id, {
      ...props,
      errorPercentageMonitoring: props.monitoringConfiguration.noMonitoring ? undefined : props.monitoringConfiguration,
    });
    const topicId = props.existingSnsTopic?.logicalIdFromCloudFormation ?? "sns-incoming-events-topic";
    const snsTopic = props.existingSnsTopic?.externalTopicName
      ? Topic.fromTopicArn(
          scope,
          topicId,
          `arn:aws:sns:${scope.region}:${scope.account}:${props.existingSnsTopic.externalTopicName}`
        )
      : new GuSnsTopic(scope, topicId, {
          overrideId: !!props.existingSnsTopic?.logicalIdFromCloudFormation,
        });
    this.addEventSource(new SnsEventSource(snsTopic));
  }
}
