import { SnsEventSource } from "@aws-cdk/aws-lambda-event-sources";
import { Topic } from "@aws-cdk/aws-sns";
import { CfnOutput } from "@aws-cdk/core";
import { AppIdentity } from "../constructs/core/identity";
import { GuLambdaFunction } from "../constructs/lambda";
import { GuSnsTopic } from "../constructs/sns";
import type { GuLambdaErrorPercentageMonitoringProps, NoMonitoring } from "../constructs/cloudwatch";
import type { GuStack } from "../constructs/core";
import type { GuMigratingResource } from "../constructs/core/migrating";
import type { GuFunctionProps } from "../constructs/lambda";

/**
 * Used to provide information about an existing SNS topic to the [[`GuSnsLambda`]] pattern.
 *
 * Specify a `existingLogicalId` to inherit an SNS topic which has already
 * been created via a CloudFormation stack. This is necessary to avoid interruptions of
 * service when migrating stacks from CloudFormation to `cdk`.
 *
 * Specify an `externalTopicName` to link the lambda to an SNS topic owned by a different stack
 * (or created outside of version control).
 *
 * **Example Usage**
 *
 * When migrating a CloudFormation stack which includes the following resource:
 * ```yaml
 * MyCloudFormedSnsTopic:
 *   Type: AWS::SNS::Topic
 * ```
 * Inherit the SNS topic (rather than creating a new one) using:
 * ```typescript
 *  existingSnsTopic: { existingLogicalId: "MyCloudFormedSnsTopic" }
 * ```
 *
 * Alternatively, reference an SNS topic which belongs to another stack using:
 * ```typescript
 *  existingSnsTopic: { externalTopicName: "MySnsTopicNameFromAnotherStack" }
 * ```
 */
export interface ExistingSnsTopic extends GuMigratingResource {
  externalTopicName?: string;
}

/**
 * Configuration options for the [[`GuSnsLambda`]] pattern.
 *
 * For all lambda function configuration options, see [[`GuFunctionProps`]].
 *
 * The `existingSnsTopic` property can be used to inherit or reference an SNS topic which
 * has been created outside of `cdk`. If this property is omitted, the [[`GuSnsLambda`]] pattern
 * will create a new topic. For more details and example usage, see [[`ExistingSnsTopic`]].
 *
 * It is advisable to configure an alarm based on the lambda's error percentage.
 * To do this, add the `monitoringConfiguration` property. The required properties for this are:
 *
 * ```typescript
 * monitoringConfiguration: {
 *   toleratedErrorPercentage: <sensible_error_percentage_threshold>,
 *   snsTopicName: "my-topic-for-cloudwatch-alerts",
 * }
 * ```
 * Other alarm properties (e.g. alarm name and description) will be pre-populated with sensible defaults.
 * For a full list of optional properties, see [[`GuLambdaErrorPercentageMonitoringProps`]].
 *
 * If your team do not use CloudWatch, it's possible to opt-out with the following configuration:
 * ```typescript
 *  monitoringConfiguration: { noMonitoring: true } as NoMonitoring
 * ```
 */
export interface GuSnsLambdaProps extends Omit<GuFunctionProps, "errorPercentageMonitoring"> {
  monitoringConfiguration: NoMonitoring | GuLambdaErrorPercentageMonitoringProps;
  existingSnsTopic?: ExistingSnsTopic;
}

/**
 * Pattern which creates all of the resources needed to invoke a lambda function whenever a message
 * is published onto an SNS topic.
 *
 * This pattern will create a new SNS topic by default. If you are migrating a stack from CloudFormation,
 * you will need to opt-out of this behaviour. For information on overriding the default behaviour,
 * see [[`GuSnsLambdaProps`]].
 */
export class GuSnsLambda extends GuLambdaFunction {
  constructor(scope: GuStack, id: string, props: GuSnsLambdaProps) {
    super(scope, id, {
      ...props,
      errorPercentageMonitoring: props.monitoringConfiguration.noMonitoring ? undefined : props.monitoringConfiguration,
    });
    const topicId = props.existingSnsTopic?.existingLogicalId?.logicalId ?? "SnsIncomingEventsTopic";

    const snsTopic = props.existingSnsTopic?.externalTopicName
      ? Topic.fromTopicArn(
          scope,
          topicId,
          `arn:aws:sns:${scope.region}:${scope.account}:${props.existingSnsTopic.externalTopicName}`
        )
      : AppIdentity.taggedConstruct(
          props,
          new GuSnsTopic(scope, topicId, {
            existingLogicalId: props.existingSnsTopic?.existingLogicalId,
          })
        );
    this.addEventSource(new SnsEventSource(snsTopic));
    new CfnOutput(this, "TopicName", { value: snsTopic.topicName });
  }
}
