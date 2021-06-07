import { ComparisonOperator, MathExpression, Statistic, TreatMissingData } from "@aws-cdk/aws-cloudwatch";
import { HttpCodeElb, HttpCodeTarget } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Duration } from "@aws-cdk/core";
import { AppIdentity } from "../core/identity";
import { GuAlarm } from "./alarm";
import type { GuStack } from "../core";
import type { GuApplicationLoadBalancer, GuApplicationTargetGroup } from "../loadbalancing";
import type { GuAlarmProps } from "./alarm";

export interface Http5xxAlarmProps
  extends Omit<
    GuAlarmProps,
    "snsTopicName" | "evaluationPeriods" | "metric" | "period" | "threshold" | "treatMissingData"
  > {
  tolerated5xxPercentage: number;
  numberOfMinutesAboveThresholdBeforeAlarm?: number;
}

interface Gu5xxPercentageAlarmProps extends Pick<GuAlarmProps, "snsTopicName">, Http5xxAlarmProps, AppIdentity {
  loadBalancer: GuApplicationLoadBalancer;
}

interface GuUnhealthyInstancesAlarmProps extends Pick<GuAlarmProps, "snsTopicName">, AppIdentity {
  targetGroup: GuApplicationTargetGroup;
}

/**
 * Creates an alarm which is triggered whenever the percentage of requests with a 5xx response code exceeds
 * the specified threshold.
 */
export class Gu5xxPercentageAlarm extends GuAlarm {
  constructor(scope: GuStack, props: Gu5xxPercentageAlarmProps) {
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
    super(scope, AppIdentity.suffixText(props, "High5xxPercentageAlarm"), alarmProps);
  }
}

/**
 * Creates an alarm which is triggered whenever there have been several healthcheck failures within a single hour.
 */
export class GuUnhealthyInstancesAlarm extends GuAlarm {
  constructor(scope: GuStack, props: GuUnhealthyInstancesAlarmProps) {
    const alarmName = `Unhealthy instances for ${props.app} in ${scope.stage}`;
    const alarmDescription = `${props.app}'s instances have failed healthchecks several times over the last hour.
      This typically results in the AutoScaling Group cycling instances and can lead to problems with deployment,
      scaling or handling traffic spikes.

      Check ${props.app}'s application logs or ssh onto an unhealthy instance in order to debug these problems.`;
    const alarmProps = {
      ...props,
      alarmName: alarmName,
      alarmDescription: alarmDescription,
      metric: props.targetGroup.metricUnhealthyHostCount(),
      treatMissingData: TreatMissingData.NOT_BREACHING,
      statistic: Statistic.MAXIMUM,
      threshold: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      period: Duration.minutes(5),
      datapointsToAlarm: 6,
      evaluationPeriods: 12,
    };
    super(scope, AppIdentity.suffixText(props, "UnhealthyInstancesAlarm"), alarmProps);
  }
}
