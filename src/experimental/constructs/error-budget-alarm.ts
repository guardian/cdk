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
  badEvents: IMetric; // Should this be IMetric[]?
  validEvents: IMetric; // Should this be IMetric[]?
  // Could accept a MathExpression for more complicated cases?
}

interface BurnRateSpeed {
  speed: 'Fast' | 'Moderate' | 'Slow';
  burnRate: number;
}

interface BurnRate extends BurnRateSpeed {
  longWindow: Duration;
  shortWindow: Duration;
}

interface IndividualBurnRateAlarmProps {
  burnRateSpeed: BurnRateSpeed;
  window: Duration;
  errorBudget: number;
  badEvents: IMetric;
  validEvents: IMetric;
}

interface CompositeBurnRateAlarmProps {
  burnRate: BurnRate;
  errorBudget: number;
  badEvents: IMetric;
  validEvents: IMetric;
  snsTopic: ITopic;
}

function applySuppression(
  alarmToSuppress: CompositeAlarm,
  suppressingAlarm: CompositeAlarm,
  shortWindow: Duration,
) {
  const cfnAlarm = alarmToSuppress.node.defaultChild as CfnCompositeAlarm;
  cfnAlarm.actionsSuppressor = suppressingAlarm.alarmArn;
  cfnAlarm.actionsSuppressorWaitPeriod = 120;
  cfnAlarm.actionsSuppressorExtensionPeriod = shortWindow.toSeconds();
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

    const fastBurnRate: BurnRate = {
      speed: 'Fast',
      burnRate: 15,
      longWindow: Duration.hours(1),
      shortWindow: Duration.minutes(5),
    };

    const fastBurnAlarm = new CompositeBurnRateAlarm(scope, {
      badEvents: props.badEvents,
      burnRate: fastBurnRate,
      errorBudget,
      snsTopic,
      validEvents: props.validEvents,
    });

    const moderateBurnRate: BurnRate = {
      speed: 'Moderate',
      burnRate: 6,
      longWindow: Duration.hours(6),
      shortWindow: Duration.minutes(30),
    };

    const moderateBurnAlarm = new CompositeBurnRateAlarm(scope, {
      badEvents: props.badEvents,
      burnRate: moderateBurnRate,
      errorBudget,
      snsTopic,
      validEvents: props.validEvents,
    });

    applySuppression(
      moderateBurnAlarm,
      fastBurnAlarm,
      moderateBurnRate.shortWindow,
    );

    const slowBurnRate: BurnRate = {
      speed: 'Slow',
      burnRate: 3,
      longWindow: Duration.days(1),
      shortWindow: Duration.hours(2),
    };

    const slowBurnAlarm = new CompositeBurnRateAlarm(scope, {
      badEvents: props.badEvents,
      burnRate: slowBurnRate,
      errorBudget,
      snsTopic, // TODO - use a different topic for tickets or figure out how to route notifications vs tickets using a single topic
      validEvents: props.validEvents,
    });

    applySuppression(
      slowBurnAlarm,
      moderateBurnAlarm,
      slowBurnRate.shortWindow,
    );

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
        speed: props.burnRate.speed,
        burnRate: props.burnRate.burnRate,
      },
      errorBudget: props.errorBudget,
      validEvents: props.validEvents
    };
    super(scope,
      `${props.burnRate.speed}BurnCompositeAlarm`,
      {
        alarmRule: AlarmRule.allOf(
          AlarmRule.fromAlarm(
            new IndividualBurnRateAlarm(scope, {
              ...sharedIndividualAlarmProps,
              window: props.burnRate.longWindow,
            }),
            AlarmState.ALARM,
          ),
          AlarmRule.fromAlarm(
            new IndividualBurnRateAlarm(scope, {
              ...sharedIndividualAlarmProps,
              window: props.burnRate.shortWindow,
            }),
            AlarmState.ALARM,
          ),
        ),
      },
    );
    this.addAlarmAction(new SnsAction(props.snsTopic));
  }
}
