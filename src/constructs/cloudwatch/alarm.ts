import type { AlarmProps } from "aws-cdk-lib/aws-cloudwatch";
import { Alarm } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import type { ITopic } from "aws-cdk-lib/aws-sns";
import { Topic } from "aws-cdk-lib/aws-sns";
import type { AppIdentity, GuStack } from "../core";

export interface GuAlarmProps extends AlarmProps, AppIdentity {
  snsTopicName: string;
  okAction?: boolean;
  cta?: GuAlarmCtaProps;
}

export interface GuAlarmCtaProps {
  runbook?: string;
  elkSpace?: string;
}

export interface Http4xxAlarmProps extends Omit<
  GuAlarmProps,
  "snsTopicName" | "evaluationPeriods" | "metric" | "period" | "threshold" | "treatMissingData" | "app"
> {
  tolerated4xxPercentage: number;
  numberOfMinutesAboveThresholdBeforeAlarm?: number;
}

export interface Http5xxAlarmProps extends Omit<
  GuAlarmProps,
  "snsTopicName" | "evaluationPeriods" | "metric" | "period" | "threshold" | "treatMissingData" | "app"
> {
  tolerated5xxPercentage: number;
  numberOfMinutesAboveThresholdBeforeAlarm?: number;
}

export class GuAlarmCta {
  ctaLinks: string[];
  markdown: string;
  constructor(scope: GuStack, props: GuAlarmCtaProps) {
    const providedRunbook = props.runbook;
    const generatedLink =
      props.elkSpace && scope.app
        ? [
            `https://logs.gutools.co.uk/s/${props.elkSpace}/app/discover#/?`,
            "_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-1d,to:now))",
            "&",
            "_a=(columns:!(stack,stage,message,app),filters:!(",
            `('$state':(store:appState),meta:(alias:!n,disabled:!f,key:stack.keyword,negate:!f,params:(query:${scope.stack}),type:phrase),query:(match_phrase:(stack.keyword:${scope.stack}))),`,
            `('$state':(store:appState),meta:(alias:!n,disabled:!f,key:app.keyword,negate:!f,params:(query:${scope.app}),type:phrase),query:(match_phrase:(app.keyword:${scope.app}))),`,
            `('$state':(store:appState),meta:(alias:!n,disabled:!f,key:stage.keyword,negate:!f,params:(query:${scope.stage}),type:phrase),query:(match_phrase:(stage.keyword:${scope.stage})))`,
            "),",
            "hideChart:!t,interval:auto,query:(language:kuery,query:''),",
            "sort:!(!('@timestamp',desc))",
            ")"
          ].join("")


        : undefined;
    this.ctaLinks = [providedRunbook, generatedLink].filter((link): link is string => !!link);

    const markdownLinks = [
      providedRunbook ? `[runbook](${providedRunbook})` : undefined,
      generatedLink ? `[logs](${generatedLink})` : undefined,
    ].filter((link): link is string => !!link);
    this.markdown = markdownLinks.length > 0 ? ["---", ...markdownLinks].join("\n") : "";
  }
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
 * for example the [[`GuAlb5xxPercentageAlarm`]]. Prefer using these more specific implementations where possible.
 */
export class GuAlarm extends Alarm {
  constructor(scope: GuStack, id: string, props: GuAlarmProps) {
    const { region, account } = scope;
    const { snsTopicName, actionsEnabled = true, okAction } = props;
    const alarmCta: GuAlarmCta | undefined = props.cta && new GuAlarmCta(scope, props.cta);
    const alarmDescription = [props.alarmDescription, alarmCta?.markdown]
      .filter((line): line is string => !!line)
      .join("\n\n");

    super(scope, id, { ...props, alarmDescription, actionsEnabled });

    const topicArn: string = `arn:aws:sns:${region}:${account}:${snsTopicName}`;
    const snsTopic: ITopic = Topic.fromTopicArn(scope, `SnsTopicFor${id}`, topicArn);

    this.addAlarmAction(new SnsAction(snsTopic));
    if (okAction) {
      this.addOkAction(new SnsAction(snsTopic));
    }
  }
}
