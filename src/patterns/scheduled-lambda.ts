import { Rule } from "aws-cdk-lib/aws-events";
import type { RuleTargetInput, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import type { GuLambdaErrorPercentageMonitoringProps, NoMonitoring } from "../constructs/cloudwatch";
import type { GuStack } from "../constructs/core";
import { GuLambdaFunction } from "../constructs/lambda";
import type { GuFunctionProps } from "../constructs/lambda";

export interface GuScheduledLambdaProps extends Omit<GuFunctionProps, "errorPercentageMonitoring"> {
  /**
   * Schedule(s) for the lambda task.
   */
  rules: Array<{
    /**
     * E.g.:
     *
     * - `Schedule.expression("cron(0 8 ? * MON-FRI *)")`
     * - `Schedule.rate(Duration.minutes(5))`
     */
    schedule: Schedule;
    /**
     * Optional description.
     */
    description?: string;
    /**
     * Optional input
     */
    input?: RuleTargetInput;
  }>;
  /**
   * Monitoring configuration for the lambda.
   *
   * Opting-out via the `NoMonitoring` type is supported but discouraged.
   */
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
      // If we have an alias, use this to ensure that all invocations are handled by a published Lambda version.
      // Otherwise, use the latest unpublished version ($LATEST)
      const resourceToInvoke = this.alias ?? this;

      // Sanitize the expression string for use in a construct ID.
      // Schedule expressions like `cron(* * * * ? *)` contain characters
      // that are invalid in CloudFormation logical IDs and lead to
      // unstable resource identifiers across deployments.
      const sanitisedExpression = rule.schedule.expressionString.replace(/[^a-zA-Z0-9-]/g, "");

      new Rule(this, `${id}-${sanitisedExpression}-${index}`, {
        schedule: rule.schedule,
        targets: [new LambdaFunction(resourceToInvoke, { event: rule.input })],
        ...(rule.description && { description: rule.description }),
        enabled: true,
      });
    });
  }
}
