import { SSM_PARAMETER_PATHS } from "../../../constants/ssm-parameter-paths";
import { isSingletonPresentInStack } from "../../../utils/singleton";
import type { GuStack } from "../stack";
import { GuStringParameter } from "./base";

/**
 * Creates a CloudFormation parameter which references an SNS topic to send
 * alarms to. By default, the bucket name is stored in an SSM Parameter called
 * `/account/services/alarm.topic.name`.
 */
export class GuAlarmTopicParameter extends GuStringParameter {
  private static instance: GuAlarmTopicParameter | undefined;

  private constructor(scope: GuStack) {
    super(scope, "AlarmTopicName", {
      description: SSM_PARAMETER_PATHS.AlarmTopic.description,
      default: SSM_PARAMETER_PATHS.AlarmTopic.path,
      fromSSM: true,
    });
  }

  public static getInstance(stack: GuStack): GuAlarmTopicParameter {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuAlarmTopicParameter(stack);
    }

    return this.instance;
  }
}

/**
 * Creates a CloudFormation parameter which references an SNS topic to send
 * notifications to. By default, the bucket name is stored in an SSM Parameter
 * called `/account/services/alarm.topic.name`.
 */
export class GuNotificationTopicParameter extends GuStringParameter {
  private static instance: GuNotificationTopicParameter | undefined;

  private constructor(scope: GuStack) {
    super(scope, "NotificationTopicName", {
      description: SSM_PARAMETER_PATHS.NotificationTopic.description,
      default: SSM_PARAMETER_PATHS.NotificationTopic.path,
      fromSSM: true,
    });
  }

  public static getInstance(stack: GuStack): GuNotificationTopicParameter {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuNotificationTopicParameter(stack);
    }

    return this.instance;
  }
}
