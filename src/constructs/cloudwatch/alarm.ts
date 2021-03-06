import type { AlarmProps } from "@aws-cdk/aws-cloudwatch";
import { Alarm } from "@aws-cdk/aws-cloudwatch";
import { SnsAction } from "@aws-cdk/aws-cloudwatch-actions";
import type { ITopic } from "@aws-cdk/aws-sns";
import { Topic } from "@aws-cdk/aws-sns";
import type { GuStack } from "../core";

export interface GuAlarmProps extends AlarmProps {
  snsTopicName: string;
}

export class GuAlarm extends Alarm {
  constructor(scope: GuStack, id: string, props: GuAlarmProps) {
    super(scope, id, props);
    const topicArn: string = `arn:aws:sns:${scope.region}:${scope.account}:${props.snsTopicName}`;
    const snsTopic: ITopic = Topic.fromTopicArn(scope, "sns-topic-for-alarm-notifications", topicArn);
    this.addAlarmAction(new SnsAction(snsTopic));
  }
}
