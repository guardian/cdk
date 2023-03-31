import type { Schedule } from "aws-cdk-lib/aws-events";
import { Rule } from "aws-cdk-lib/aws-events";
import { SfnStateMachine } from "aws-cdk-lib/aws-events-targets";
import type { GuStack } from "../constructs/core";
import type { GuEcsTaskProps } from "../constructs/ecs";
import { GuEcsTask } from "../constructs/ecs";
import { GuAppAwareConstruct } from "../utils/mixin/app-aware-construct";

export interface GuScheduledEcsTaskProps extends GuEcsTaskProps {
  /**
   * Schedule for the task.
   *
   * E.g.:
   *
   * - `Schedule.expression("cron(0 8 ? * MON-FRI *)")`
   * - `Schedule.rate(Duration.minutes(5))`
   */
  schedule: Schedule;
}

/**
 * Pattern which creates all of the resources needed to invoke a fargate task on a schedule.
 *
 * The task will be wrapped in a step function to allow for easier triggering and alarming on failure.
 *
 * For all configuration options, see [[`GuScheduledEcsTaskProps`]].
 *
 * Note that if your task reliably completes in less than 15 minutes then you should probably use a [[`GuScheduledLambda`]] instead. This
 * pattern was mainly created to work around the 15 minute lambda timeout.
 */
export class GuScheduledEcsTask extends GuAppAwareConstruct(GuEcsTask) {
  constructor(scope: GuStack, id: string, props: GuScheduledEcsTaskProps) {
    super(scope, id, props);

    new Rule(scope, `${id}-ScheduleRule`, {
      schedule: props.schedule,
      targets: [new SfnStateMachine(this.stateMachine)],
      enabled: true,
    });
  }
}
