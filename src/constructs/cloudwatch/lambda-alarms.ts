import { ComparisonOperator, MathExpression } from "@aws-cdk/aws-cloudwatch";
import type { GuStack } from "../core";
import type { GuLambdaFunction } from "../lambda";
import type { GuAlarmProps } from "./alarm";
import { GuAlarm } from "./alarm";

export type LambdaMonitoring = NoMonitoring | ErrorPercentageMonitoring;

export interface NoMonitoring {
  noMonitoring: true;
}

export interface ErrorPercentageMonitoring
  extends Omit<GuAlarmProps, "metric" | "threshold" | "comparisonOperator" | "evaluationPeriods"> {
  toleratedErrorPercentage: number;
  numberOfFiveMinutePeriodsToEvaluate?: number;
  noMonitoring?: false;
}

interface GuLambdaAlarmProps extends ErrorPercentageMonitoring {
  lambda: GuLambdaFunction;
}

export class GuLambdaErrorPercentageAlarm extends GuAlarm {
  constructor(scope: GuStack, id: string, props: GuLambdaAlarmProps) {
    const mathExpression = new MathExpression({
      expression: "100*m1/m2",
      usingMetrics: { m1: props.lambda.metricErrors(), m2: props.lambda.metricInvocations() },
    });
    const alarmProps = {
      ...props,
      metric: mathExpression,
      threshold: props.toleratedErrorPercentage,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: props.numberOfFiveMinutePeriodsToEvaluate ? props.numberOfFiveMinutePeriodsToEvaluate : 1,
    };
    super(scope, id, alarmProps);
  }
}
