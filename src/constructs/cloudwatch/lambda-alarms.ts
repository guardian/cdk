import { Duration } from "aws-cdk-lib";
import { ComparisonOperator, MathExpression, TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import type { GuApp } from "../core";
import type { GuLambdaFunction } from "../lambda";
import { GuAlarm } from "./alarm";
import type { GuAlarmProps } from "./alarm";

export interface GuLambdaErrorPercentageMonitoringProps
  extends Omit<
    GuAlarmProps,
    "metric" | "threshold" | "comparisonOperator" | "evaluationPeriods" | "treatMissingData" | "app"
  > {
  toleratedErrorPercentage: number;
  numberOfMinutesAboveThresholdBeforeAlarm?: number;
  noMonitoring?: false;
}

interface GuLambdaAlarmProps extends GuLambdaErrorPercentageMonitoringProps {
  lambda: GuLambdaFunction;
}

/**
 * Creates an alarm which is triggered whenever the error percentage specified is exceeded.
 */
export class GuLambdaErrorPercentageAlarm extends GuAlarm {
  constructor(scope: GuApp, id: string, props: GuLambdaAlarmProps) {
    const mathExpression = new MathExpression({
      expression: "100*m1/m2",
      usingMetrics: { m1: props.lambda.metricErrors(), m2: props.lambda.metricInvocations() },
      label: `Error % of ${props.lambda.functionName}`,
      period: Duration.minutes(1),
    });
    const defaultAlarmName = `High error % from ${props.lambda.functionName} lambda in ${scope.stage}`;
    const defaultDescription = `${props.lambda.functionName} exceeded ${props.toleratedErrorPercentage}% error rate`;
    const alarmProps: GuAlarmProps = {
      ...props,
      metric: mathExpression,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      threshold: props.toleratedErrorPercentage,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: props.numberOfMinutesAboveThresholdBeforeAlarm ?? 1,
      alarmName: props.alarmName ?? defaultAlarmName,
      alarmDescription: props.alarmDescription ?? defaultDescription,
    };
    super(scope, id, alarmProps);
  }
}

export interface GuLambdaThrottlingMonitoringProps
  extends Omit<
    GuAlarmProps,
    "metric" | "threshold" | "comparisonOperator" | "evaluationPeriods" | "treatMissingData" | "app"
  > {
  /**
   * Sum of thottled invocations above which to alarm.
   *
   * @defaultValue 0
   */
  toleratedThrottlingCount?: number;

  /**
   * Evaluation period in minutes for alarm.
   *
   * @defaultValue 1
   */
  numberOfMinutesAboveThresholdBeforeAlarm?: number;

  noMonitoring?: false;
}

interface GuLambdaThrottlingAlarmProps extends GuLambdaThrottlingMonitoringProps {
  lambda: GuLambdaFunction;
}

export class GuLambdaThrottlingAlarm extends GuAlarm {
  constructor(scope: GuApp, id: string, props: GuLambdaThrottlingAlarmProps) {
    super(scope, id, {
      ...props,
      alarmName:
        props.alarmName ?? `Lambda throttling alarm for ${props.lambda.functionName} lambda in ${scope.stage}.`,
      alarmDescription:
        props.alarmDescription ?? "Alarm when lambda is throttled (which causes requests to fail with a 429).",
      threshold: props.toleratedThrottlingCount ?? 0,
      evaluationPeriods: props.numberOfMinutesAboveThresholdBeforeAlarm ?? 1,
      metric: props.lambda.metricThrottles({
        period: Duration.seconds(60),
        statistic: "sum",
      }),
      treatMissingData: TreatMissingData.NOT_BREACHING,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
    });
  }
}
