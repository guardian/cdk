import { ComparisonOperator, MathExpression, TreatMissingData } from "@aws-cdk/aws-cloudwatch";
import { HttpCodeElb, HttpCodeTarget } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Duration } from "@aws-cdk/core";
import type { GuStack } from "../core";
import type { AppIdentity } from "../core/identity";
import type { GuApplicationLoadBalancer } from "../loadbalancing";
import type { GuAlarmProps } from "./alarm";
import { GuAlarm } from "./alarm";

/**
 * Creates an alarm which is triggered whenever the percentage of requests with a 5xx response code exceeds
 * the specified threshold.
 */
export interface Gu5xxPercentageMonitoringProps
  extends Omit<GuAlarmProps, "evaluationPeriods" | "metric" | "period" | "threshold" | "treatMissingData">,
    AppIdentity {
  tolerated5xxPercentage: number;
  numberOfMinutesAboveThresholdBeforeAlarm?: number;
  noMonitoring?: false;
}

interface GuLoadBalancerAlarmProps extends Gu5xxPercentageMonitoringProps {
  loadBalancer: GuApplicationLoadBalancer;
}

export class Gu5xxPercentageAlarm extends GuAlarm {
  constructor(scope: GuStack, id: string, props: GuLoadBalancerAlarmProps) {
    const mathExpression = new MathExpression({
      expression: "100*(m1+m2)/m3",
      usingMetrics: {
        m1: props.loadBalancer.metricHttpCodeElb(HttpCodeElb.ELB_5XX_COUNT),
        m2: props.loadBalancer.metricHttpCodeTarget(HttpCodeTarget.TARGET_5XX_COUNT),
        m3: props.loadBalancer.metricRequestCount(),
      },
      label: `% of 5XX responses served for ${props.app} (load balancer and instances combined)`,
      period: Duration.minutes(1),
    });
    const defaultAlarmName = `High 5XX error % from ${props.app} in ${scope.stage}`;
    const defaultDescription = `${props.app} exceeded ${props.tolerated5xxPercentage}% error rate`;
    const alarmProps = {
      ...props,
      metric: mathExpression,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      threshold: props.tolerated5xxPercentage,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmName: props.alarmName ?? defaultAlarmName,
      alarmDescription: props.alarmDescription ?? defaultDescription,
      evaluationPeriods: props.numberOfMinutesAboveThresholdBeforeAlarm ?? 1,
    };
    super(scope, id, alarmProps);
  }
}
