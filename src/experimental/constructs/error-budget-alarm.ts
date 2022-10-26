import { Duration } from "aws-cdk-lib";
import type { CfnCompositeAlarm,
  IMetric} from "aws-cdk-lib/aws-cloudwatch";
import {
  Alarm, AlarmRule, AlarmState,
  ComparisonOperator,
  CompositeAlarm,
  MathExpression,
  TreatMissingData
} from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import type { ITopic} from "aws-cdk-lib/aws-sns";
import { Topic } from "aws-cdk-lib/aws-sns";
import type { GuStack } from "../../constructs/core";

export interface ErrorBudgetAlarmProps {
  snsTopicNameForAlerts: string;
  sloTarget: number;
  badEvents: IMetric;
  validEvents: IMetric;
}

interface BurnRate {
  speed: 'Fast' | 'Moderate' | 'Slow';
  burnRate: number;
}

interface BurnRateMonitoring extends BurnRate {
  longWindow: Duration;
  shortWindow: Duration;
}

interface IndividualBurnRateAlarmProps {
  burnRateSpeed: BurnRate;
  window: Duration;
  errorBudget: number;
  badEvents: IMetric;
  validEvents: IMetric;
}

interface CompositeBurnRateAlarmProps {
  burnRateMonitoring: BurnRateMonitoring;
  errorBudget: number;
  badEvents: IMetric;
  validEvents: IMetric;
  snsTopic: ITopic;
  suppressorAlarm?: CompositeBurnRateAlarm;
}

// Do we need to extend construct here?
export class ErrorBudgetAlarmExperimental {

  constructor(scope: GuStack, props: ErrorBudgetAlarmProps) {

    const errorBudget = 1 - props.sloTarget;

    const snsTopic: ITopic = Topic.fromTopicArn(
      scope,
      'SnsSloAlarms',
      `arn:aws:sns:${scope.region}:${scope.account}:${props.snsTopicNameForAlerts}`,
    );

    const fastBurnRate: BurnRateMonitoring = {
      speed: 'Fast',
      burnRate: 14.4,
      longWindow: Duration.hours(1),
      shortWindow: Duration.minutes(5),
    };

    const fastBurnAlarm = new CompositeBurnRateAlarm(scope, {
      badEvents: props.badEvents,
      burnRateMonitoring: fastBurnRate,
      errorBudget,
      snsTopic,
      validEvents: props.validEvents,
    });

    const moderateBurnRate: BurnRateMonitoring = {
      speed: 'Moderate',
      burnRate: 6,
      longWindow: Duration.hours(6),
      shortWindow: Duration.minutes(30),
    };

    const moderateBurnAlarm = new CompositeBurnRateAlarm(scope, {
      badEvents: props.badEvents,
      burnRateMonitoring: moderateBurnRate,
      errorBudget,
      snsTopic,
      validEvents: props.validEvents,
      suppressorAlarm: fastBurnAlarm,
    });

    const slowBurnRate: BurnRateMonitoring = {
      speed: 'Slow',
      burnRate: 3,
      longWindow: Duration.days(1),
      shortWindow: Duration.hours(2),
    };

    new CompositeBurnRateAlarm(scope, {
      badEvents: props.badEvents,
      burnRateMonitoring: slowBurnRate,
      errorBudget,
      // TODO - use a different topic for tickets or figure out how to route notifications vs tickets using a single topic
      snsTopic,
      validEvents: props.validEvents,
      suppressorAlarm: moderateBurnAlarm,
    });

  }

}

class IndividualBurnRateAlarm extends Alarm {
  constructor(scope: GuStack, props: IndividualBurnRateAlarmProps) {
    const undesirableErrorBudgetConsumption = props.errorBudget * props.burnRateSpeed.burnRate;
    super(
      scope,
      `${props.burnRateSpeed.speed}BurnOver${props.window.toHumanString()}`,
      {
        metric: new MathExpression({
          expression: `badEvents/validEvents`,
          label: 'Observed failure rate',
          usingMetrics: {
            badEvents: props.badEvents,
            validEvents: props.validEvents,
          },
          period: props.window,
        }),
        evaluationPeriods: 1,
        threshold: undesirableErrorBudgetConsumption,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      },
    );
  }
}

class CompositeBurnRateAlarm extends CompositeAlarm {
  constructor(scope: GuStack, props: CompositeBurnRateAlarmProps) {
    const sharedIndividualAlarmProps = {
      badEvents: props.badEvents,
      burnRateSpeed: {
        speed: props.burnRateMonitoring.speed,
        burnRate: props.burnRateMonitoring.burnRate,
      },
      errorBudget: props.errorBudget,
      validEvents: props.validEvents
    };
    super(scope,
      // TODO: Ensure that this id is unique if we have multiple alarms in the same stack
      `${props.burnRateMonitoring.speed}BurnCompositeAlarm`,
      {
        alarmRule: AlarmRule.allOf(
          AlarmRule.fromAlarm(
            new IndividualBurnRateAlarm(scope, {
              ...sharedIndividualAlarmProps,
              window: props.burnRateMonitoring.longWindow,
            }),
            AlarmState.ALARM,
          ),
          AlarmRule.fromAlarm(
            new IndividualBurnRateAlarm(scope, {
              ...sharedIndividualAlarmProps,
              window: props.burnRateMonitoring.shortWindow,
            }),
            AlarmState.ALARM,
          ),
        ),
      },
    );
    this.addAlarmAction(new SnsAction(props.snsTopic));
    if (props.suppressorAlarm) {
      const cfnAlarm = this.node.defaultChild as CfnCompositeAlarm;
      cfnAlarm.actionsSuppressor = props.suppressorAlarm.alarmArn;
      cfnAlarm.actionsSuppressorWaitPeriod = 120;
      cfnAlarm.actionsSuppressorExtensionPeriod = props.burnRateMonitoring.shortWindow.toSeconds();
    }
  }
}
