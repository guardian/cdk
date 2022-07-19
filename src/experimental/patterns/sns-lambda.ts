import { CfnOutput } from "aws-cdk-lib";
import { SnsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import type { ITopic } from "aws-cdk-lib/aws-sns";
import { Topic } from "aws-cdk-lib/aws-sns";
import type { GuConstruct } from "../../aspects/metadata";
import type { GuLambdaErrorPercentageMonitoringProps, NoMonitoring } from "../../constructs/cloudwatch";
import { AppIdentity } from "../../constructs/core";
import type { GuStack } from "../../constructs/core";
import { GuLambdaFunction } from "../../constructs/lambda";
import type { GuFunctionProps } from "../../constructs/lambda";
import { GuSnsTopic } from "../../constructs/sns";

/**
 * Used to provide information about an existing SNS topic to the [[`GuSnsLambda`]] pattern.
 *
 * Specify an `externalTopicName` to link the lambda to an SNS topic owned by a different stack
 * (or created outside of version control).
 */
export interface ExistingSnsTopic {
  externalTopicName: string;
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
 *
 * The SNS topic is stateful, and is accessible via `snsTopic`.
 * @see https://github.com/guardian/cdk/blob/main/docs/stateful-resources.md
 *
 * @experimental This pattern is in early development. The API is likely to change in future releases.
 */
export class GuSnsLambdaExperimental extends GuLambdaFunction implements GuConstruct {
  public readonly snsTopic: ITopic;
  readonly guConstructID = "GuSnsLambda";

  constructor(scope: GuStack, id: string, props: GuSnsLambdaProps) {
    super(scope, id, {
      ...props,
      errorPercentageMonitoring: props.monitoringConfiguration.noMonitoring ? undefined : props.monitoringConfiguration,
    });

    const { account, region } = scope;
    const { existingSnsTopic } = props;

    this.snsTopic = existingSnsTopic
      ? Topic.fromTopicArn(
          scope,
          `${id}-SnsExistingIncomingEventsTopic`,
          `arn:aws:sns:${region}:${account}:${existingSnsTopic.externalTopicName}`
        )
      : AppIdentity.taggedConstruct(props, new GuSnsTopic(scope, "SnsIncomingEventsTopic"));

    this.addEventSource(new SnsEventSource(this.snsTopic));
    new CfnOutput(this, "TopicName", { value: this.snsTopic.topicName });
  }
}
