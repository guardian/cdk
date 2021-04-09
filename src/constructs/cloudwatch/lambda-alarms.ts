import { ComparisonOperator, MathExpression, TreatMissingData } from "@aws-cdk/aws-cloudwatch";
import type { GuStack } from "../core";
import type { GuLambdaFunction } from "../lambda";
import type { GuAlarmProps } from "./alarm";
import { GuAlarm } from "./alarm";

/**
 * Creates an alarm which is triggered whenever the error percentage specified is exceeded.
 */
export interface GuLambdaErrorPercentageMonitoringProps
  extends Omit<GuAlarmProps, "metric" | "threshold" | "comparisonOperator" | "evaluationPeriods" | "treatMissingData"> {
  toleratedErrorPercentage: number;
  numberOfFiveMinutePeriodsToEvaluate?: number;
  noMonitoring?: false;
}

interface GuLambdaAlarmProps extends GuLambdaErrorPercentageMonitoringProps {
  lambda: GuLambdaFunction;
}

export class GuLambdaErrorPercentageAlarm extends GuAlarm {
  constructor(scope: GuStack, id: string, props: GuLambdaAlarmProps) {
    const mathExpression = new MathExpression({
      expression: "100*m1/m2",
      usingMetrics: { m1: props.lambda.metricErrors(), m2: props.lambda.metricInvocations() },
      label: `Error % of ${props.lambda.functionName}`,
    });
    const defaultAlarmName = `High error % from ${props.lambda.functionName} lambda in ${scope.stage}`;
    const defaultDescription = `${props.lambda.functionName} exceeded ${props.toleratedErrorPercentage}% error rate`;
    const alarmProps = {
      ...props,
      metric: mathExpression,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      threshold: props.toleratedErrorPercentage,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: props.numberOfFiveMinutePeriodsToEvaluate ?? 1,
      alarmName: props.alarmName ?? defaultAlarmName,
      alarmDescription: props.alarmDescription ?? defaultDescription,
    };
    super(scope, id, alarmProps);
  }
}
