import type { AlarmProps } from "@aws-cdk/aws-cloudwatch";
import { Alarm } from "@aws-cdk/aws-cloudwatch";
import { SnsAction } from "@aws-cdk/aws-cloudwatch-actions";
import type { ITopic } from "@aws-cdk/aws-sns";
import { Topic } from "@aws-cdk/aws-sns";
import type { GuStack } from "../core";

interface GuAlarmProps extends AlarmProps {
  snsTopicArn: string;
}

export class GuAlarm extends Alarm {
  constructor(scope: GuStack, id: string, props: GuAlarmProps) {
    super(scope, id, props);
    const snsTopic: ITopic = Topic.fromTopicArn(scope, "sns-topic-for-alarm-notifications", props.snsTopicArn);
    this.addAlarmAction(new SnsAction(snsTopic));
  }
}
