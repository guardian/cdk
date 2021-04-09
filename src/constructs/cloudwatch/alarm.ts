import type { AlarmProps } from "@aws-cdk/aws-cloudwatch";
import { Alarm } from "@aws-cdk/aws-cloudwatch";
import { SnsAction } from "@aws-cdk/aws-cloudwatch-actions";
import type { ITopic } from "@aws-cdk/aws-sns";
import { Topic } from "@aws-cdk/aws-sns";
import { Stage } from "../../constants";
import type { GuStack, GuStageDependentValue } from "../core";

export interface GuAlarmProps extends AlarmProps {
  snsTopicName: string;
  actionsEnabledInCode?: boolean;
}

export class GuAlarm extends Alarm {
  constructor(scope: GuStack, id: string, props: GuAlarmProps) {
    const actionsEnabled: GuStageDependentValue<boolean> = {
      variableName: "alarmActionsEnabled",
      stageValues: {
        [Stage.CODE]: props.actionsEnabledInCode ?? false,
        [Stage.PROD]: true,
      },
    };
    super(scope, id, { ...props, actionsEnabled: scope.withStageDependentValue(actionsEnabled) });
    const topicArn: string = `arn:aws:sns:${scope.region}:${scope.account}:${props.snsTopicName}`;
    const snsTopic: ITopic = Topic.fromTopicArn(scope, "sns-topic-for-alarm-notifications", topicArn);
    this.addAlarmAction(new SnsAction(snsTopic));
  }
}
