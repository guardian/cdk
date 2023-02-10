import { Rule } from "aws-cdk-lib/aws-events";
import type { Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import type { GuLambdaErrorPercentageMonitoringProps, NoMonitoring } from "../constructs/cloudwatch";
import type { GuStack } from "../constructs/core";
import { GuLambdaFunction } from "../constructs/lambda";
import type { GuFunctionProps } from "../constructs/lambda";

/**
 * Configuration options for the [[`GuScheduledLambda`]] pattern.
 *
 * For all lambda function configuration options, see [[`GuFunctionProps`]].
 *
 * The `schedule` property determines when your lambda is invoked. For example, to invoke
 * the lambda every 5 minutes, use:
 * ```typescript
 * import { Schedule } from "aws-cdk-lib/aws-events";
 * import { Duration } from "aws-cdk-lib/core";
 *
 * const props = {
 *   // Other props here
 *   rules: [{ schedule: Schedule.rate(Duration.minutes(5)) }],
 * }
 * ```
 *
 * To invoke the lambda every weekday at 8am, use:
 * ```
 * import { Schedule } from "aws-cdk-lib/aws-events";
 *
 * const props = {
 *   // Other props here
 *   rules: [{ schedule: Schedule.expression("cron(0 8 ? * MON-FRI *)") }],
 * }
 * ```
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
 *  monitoringConfiguration: { noMonitoring: true }
 * ```
 */
export interface GuScheduledLambdaProps extends Omit<GuFunctionProps, "errorPercentageMonitoring"> {
  rules: Array<{
    schedule: Schedule;
    description?: string;
  }>;
  monitoringConfiguration: NoMonitoring | GuLambdaErrorPercentageMonitoringProps;
}

/**
 * Pattern which creates all of the resources needed to invoke a lambda function on a schedule.
 *
 * For all configuration options, see [[`GuScheduledLambdaProps`]].
 */
export class GuScheduledLambda extends GuLambdaFunction {
  constructor(scope: GuStack, id: string, props: GuScheduledLambdaProps) {
    const lambdaProps: GuFunctionProps = {
      ...props,
      errorPercentageMonitoring: props.monitoringConfiguration.noMonitoring ? undefined : props.monitoringConfiguration,
    };
    super(scope, id, lambdaProps);

    props.rules.forEach((rule, index) => {
      // If we have an alias, ensure that all invocations are handled by the most recently published Lambda version.
      // Otherwise, use the most recent unpublished version ($LATEST)
      const target = this.alias ? new LambdaFunction(this.alias) : new LambdaFunction(this);
      new Rule(this, `${id}-${rule.schedule.expressionString}-${index}`, {
        schedule: rule.schedule,
        targets: [target],
        ...(rule.description && { description: rule.description }),
        enabled: true,
      });
    });
  }
}
