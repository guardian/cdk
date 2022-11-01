import { Duration } from "aws-cdk-lib";
import type { CfnCompositeAlarm, IMetric } from "aws-cdk-lib/aws-cloudwatch";
import {
  Alarm,
  AlarmRule,
  AlarmState,
  ComparisonOperator,
  CompositeAlarm,
  MathExpression,
  TreatMissingData,
} from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import type { ITopic } from "aws-cdk-lib/aws-sns";
import { Topic } from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";
import type { GuStack } from "../../constructs/core";

export interface ErrorBudgetAlarmProps {
  sloName: string;
  sloTarget: number;
  badEvents: IMetric;
  validEvents: IMetric;
  snsTopicNameForAlerts: string;
}

interface BurnRate {
  speed: "Fast" | "Medium" | "Slow";
  burnRate: number;
}

interface BurnRateMonitoring extends BurnRate {
  longPeriod: Duration;
  shortPeriod: Duration;
}

interface MonitorBurnRateForPeriodProps {
  alarmName: string;
  burnRateSpeed: BurnRate;
  period: Duration;
  errorBudget: number;
  badEvents: IMetric;
  validEvents: IMetric;
}

interface CompositeBurnRateAlarmProps {
  sloName: string;
  burnRateMonitoring: BurnRateMonitoring;
  errorBudget: number;
  badEvents: IMetric;
  validEvents: IMetric;
  snsTopic: ITopic;
  suppressorAlarm?: CompositeBurnRateAlarm;
}

/**
 * Use this construct to create alarms that will notify you when you are at risk of missing your SLO targets.
 *
 * These alarms follow the recommendations in the [SRE Workbook](https://sre.google/workbook/alerting-on-slos/) to
 * implement Multiwindow, Multi-Burn-Rate Alerts.
 *
 * The CloudWatch implementation of this strategy creates nine separate CloudWatch alarms. The main alarms that users
 * need to care about are the three composite alarms. These track different burn rates of error budget consumption:
 * fast (e.g. complete outages), medium (e.g. moderate error percentage over hours, rather than minutes) and slow (e.g.
 * a small percentage of errors sustained over a much longer period). Multiple burn rates are used to ensure that
 * we are able to pick up all scenarios which could threaten the SLO, without interrupting developers with an
 * unnecessary level of urgency.
 *
 * Each composite alarm creates two child alarms; these are used to support multiple windows (or periods in CloudWatch
 * terminology). A composite alarm is configured to send notifications if both of its child alarms are in an alarm state.
 * The child alarms themselves have no actions/notifications configured and users should not need to interact with them
 * directly. Multiple windows are helpful for accuracy and reset time. The long window helps us to avoid sending an
 * alert in scenarios where no intervention is required, for example a very brief spike in errors that is resolved
 * automatically (e.g. when AWS replaces a 'bad' EC2 instance). The short window helps to ensure that the alert is reset
 * (or moved back into OK state, in CloudWatch terminology) promptly once a problem has been resolved.
 *
 * The composite alarms have an awareness of priority, meaning that low priority alarm notifications are suppressed if
 * a higher priority alarm is already firing. That is, if you receive an alert about fast error budget consumption, you
 * should not receive an alert from the medium or slow versions of the alarm.
 */
export class GuErrorBudgetAlarmExperimental extends Construct {
  constructor(scope: GuStack, props: ErrorBudgetAlarmProps) {
    super(scope, props.sloName); // The assumption here is that `sloName` will be unique (per stack)

    const errorBudget = 1 - props.sloTarget;

    const snsTopic: ITopic = Topic.fromTopicArn(
      scope,
      `SnsSloAlarmsFor${props.sloName}`,
      `arn:aws:sns:${scope.region}:${scope.account}:${props.snsTopicNameForAlerts}`
    );

    const fastBurnRate: BurnRateMonitoring = {
      speed: "Fast",
      burnRate: 14.4,
      longPeriod: Duration.hours(1),
      shortPeriod: Duration.minutes(5),
    };

    const fastBurnAlarm = new CompositeBurnRateAlarm(scope, {
      sloName: props.sloName,
      badEvents: props.badEvents,
      burnRateMonitoring: fastBurnRate,
      errorBudget,
      snsTopic,
      validEvents: props.validEvents,
    });

    const mediumBurnRateMonitoring: BurnRateMonitoring = {
      speed: "Medium",
      burnRate: 6,
      longPeriod: Duration.hours(6),
      shortPeriod: Duration.minutes(30),
    };

    const mediumBurnRateAlarm = new CompositeBurnRateAlarm(scope, {
      sloName: props.sloName,
      badEvents: props.badEvents,
      burnRateMonitoring: mediumBurnRateMonitoring,
      errorBudget,
      snsTopic,
      validEvents: props.validEvents,
      suppressorAlarm: fastBurnAlarm,
    });

    const slowBurnRate: BurnRateMonitoring = {
      speed: "Slow",
      burnRate: 3,
      longPeriod: Duration.days(1),
      shortPeriod: Duration.hours(2),
    };

    new CompositeBurnRateAlarm(scope, {
      sloName: props.sloName,
      badEvents: props.badEvents,
      burnRateMonitoring: slowBurnRate,
      errorBudget,
      // TODO - use a different topic for tickets or figure out how to route notifications vs tickets using a single topic
      snsTopic,
      validEvents: props.validEvents,
      suppressorAlarm: mediumBurnRateAlarm,
    });
  }
}

class MonitorBurnRateForPeriod extends Alarm {
  constructor(scope: GuStack, props: MonitorBurnRateForPeriodProps) {
    const undesirableErrorBudgetConsumption = props.errorBudget * props.burnRateSpeed.burnRate;
    super(scope, props.alarmName, {
      alarmName: props.alarmName,
      metric: new MathExpression({
        expression: "badEvents/validEvents",
        label: "Observed failure rate",
        usingMetrics: {
          badEvents: props.badEvents,
          validEvents: props.validEvents,
        },
        period: props.period,
      }),
      evaluationPeriods: 1,
      threshold: undesirableErrorBudgetConsumption,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });
  }
}

class CompositeBurnRateAlarm extends CompositeAlarm {
  constructor(scope: GuStack, props: CompositeBurnRateAlarmProps) {
    const alarmName = `${props.sloName}${props.burnRateMonitoring.speed}BurnCompositeAlarm`;
    const sharedIndividualAlarmProps = {
      badEvents: props.badEvents,
      burnRateSpeed: {
        speed: props.burnRateMonitoring.speed,
        burnRate: props.burnRateMonitoring.burnRate,
      },
      errorBudget: props.errorBudget,
      validEvents: props.validEvents,
    };
    super(scope, alarmName, {
      alarmRule: AlarmRule.allOf(
        AlarmRule.fromAlarm(
          new MonitorBurnRateForPeriod(scope, {
            ...sharedIndividualAlarmProps,
            alarmName: `ChildAlarmLongPeriod${alarmName}`,
            period: props.burnRateMonitoring.longPeriod,
          }),
          AlarmState.ALARM
        ),
        AlarmRule.fromAlarm(
          new MonitorBurnRateForPeriod(scope, {
            ...sharedIndividualAlarmProps,
            alarmName: `ChildAlarmShortPeriod${alarmName}`,
            period: props.burnRateMonitoring.shortPeriod,
          }),
          AlarmState.ALARM
        )
      ),
    });
    this.addAlarmAction(new SnsAction(props.snsTopic));
    if (props.suppressorAlarm) {
      const cfnAlarm = this.node.defaultChild as CfnCompositeAlarm;
      cfnAlarm.actionsSuppressor = props.suppressorAlarm.alarmArn;
      cfnAlarm.actionsSuppressorWaitPeriod = 120;
      cfnAlarm.actionsSuppressorExtensionPeriod = props.burnRateMonitoring.shortPeriod.toSeconds();
    }
  }
}
