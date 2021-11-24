import type { Schedule } from "@aws-cdk/aws-events";
import { Rule } from "@aws-cdk/aws-events";
import { SfnStateMachine } from "@aws-cdk/aws-events-targets";
import type { GuStack } from "../constructs/core";
import type { GuEcsTaskProps } from "../constructs/ecs/ecs-task";
import { GuEcsTask } from "../constructs/ecs/ecs-task";
import { GuAppAwareConstruct } from "../utils/mixin/app-aware-construct";

/**
 * Configuration options for the [[`GuScheduledEcsTask`]] pattern.
 *
 * The `schedule` property determines when your task is invoked. For example, to invoke
 * the task every 5 minutes, use:
 * ```typescript
 * import { Schedule } from "@aws-cdk/aws-events";
 * import { Duration } from "@aws-cdk/core";
 *
 * const props = {
 *   // Other props here
 *   schedule: Schedule.rate(Duration.minutes(5)),
 * }
 * ```
 *
 * To invoke the task every weekday at 8am, use:
 * ```
 * import { Schedule } from "@aws-cdk/aws-events";
 *
 * const props = {
 *   // Other props here
 *   schedule: Schedule.expression("cron(0 8 ? * MON-FRI *)"),
 * }
 * ```
 * See [[`GuEcsTask`]] for details of other props
 *
 */
export interface GuScheduledEcsTaskProps extends GuEcsTaskProps {
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
