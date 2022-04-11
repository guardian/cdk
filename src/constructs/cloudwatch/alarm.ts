import { Alarm } from "aws-cdk-lib/aws-cloudwatch";
import type { AlarmProps } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import { Topic } from "aws-cdk-lib/aws-sns";
import type { ITopic } from "aws-cdk-lib/aws-sns";
import type { AppIdentity, GuStack } from "../core";

export interface GuAlarmProps extends AlarmProps, AppIdentity {
  snsTopicName: string;
}

/**
 * Creates a CloudWatch alarm which sends notifications to the specified SNS topic.
 *
 * Alarm actions are enabled by default.
 *
 * To enable the alarm only in PROD, use the value of `Stage`:
 * ```typescript
 * new GuAlarm(stack, "alarm", {
 *   // other required props
 *   actionsEnabled: this.stage === "PROD",
 * });
 * ```
 *
 * This library provides an implementation of some commonly used alarms, which require less boilerplate than this construct,
 * for example [[`Gu5xxPercentageAlarm`]]. Prefer using these more specific implementations where possible.
 */
export class GuAlarm extends Alarm {
  constructor(scope: GuStack, id: string, props: GuAlarmProps) {
    const { region, account } = scope;
    const { snsTopicName, actionsEnabled = true } = props;

    super(scope, id, { ...props, actionsEnabled });

    const topicArn: string = `arn:aws:sns:${region}:${account}:${snsTopicName}`;
    const snsTopic: ITopic = Topic.fromTopicArn(scope, `SnsTopicFor${id}`, topicArn);
    this.addAlarmAction(new SnsAction(snsTopic));
  }
}
