import { Alarm } from "@aws-cdk/aws-cloudwatch";
import type { AlarmProps } from "@aws-cdk/aws-cloudwatch";
import { SnsAction } from "@aws-cdk/aws-cloudwatch-actions";
import { Topic } from "@aws-cdk/aws-sns";
import { Stage } from "../../constants";
import type { GuStack } from "../core";
import type { AppIdentity } from "../core/identity";
import { GuAlarmTopicParameter } from "../core/parameters/sns";

export interface GuAlarmProps extends AlarmProps, AppIdentity {
  /**
   * Topic ARN.
   *
   * @default account alarm topic - see {@link GuAlarmTopicParameter}.".
   */
  snsTopicArn?: string;

  /**
   * Topic Name.
   *
   * @deprecated prefer {@link GuAlarmProps.snsTopicArn} instead.
   * @default account alarm topic - see {@link GuAlarmTopicParameter}.
   */
  snsTopicName?: string;

  actionsEnabledInCode?: boolean;
}

/**
 * Creates a CloudWatch alarm which sends notifications to the specified SNS topic.
 *
 * By default, alarm notifications will be silenced in the `CODE` environment. In order to override this behaviour
 * (e.g. for testing purposes whilst configuring a new alarm), set the `actionsEnabledInCode` prop to `true`.
 *
 * This library provides an implementation of some commonly used alarms, which require less boilerplate than this construct,
 * for example [[`Gu5xxPercentageAlarm`]]. Prefer using these more specific implementations where possible.
 */
export class GuAlarm extends Alarm {
  constructor(scope: GuStack, id: string, props: GuAlarmProps) {
    super(scope, id, {
      ...props,
      actionsEnabled: scope.withStageDependentValue({
        app: props.app,
        variableName: "alarmActionsEnabled",
        stageValues: {
          [Stage.CODE]: props.actionsEnabledInCode ?? false,
          [Stage.PROD]: true,
        },
      }),
    });

    const arnFromName = props.snsTopicName
      ? `arn:aws:sns:${scope.region}:${scope.account}:${props.snsTopicName}`
      : undefined;

    const snsTopicArn = props.snsTopicArn ?? arnFromName ?? GuAlarmTopicParameter.getInstance(scope).valueAsString;
    const snsTopic = Topic.fromTopicArn(scope, `SnsTopicFor${id}`, snsTopicArn);

    this.addAlarmAction(new SnsAction(snsTopic));
  }
}
