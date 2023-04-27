import { Duration } from "aws-cdk-lib";
import { ComparisonOperator, MathExpression, Statistic, TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { HttpCodeElb, HttpCodeTarget } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import type { GuStack } from "../core";
import { AppIdentity } from "../core";
import type { GuApplicationLoadBalancer, GuApplicationTargetGroup } from "../loadbalancing";
import { GuAlarm } from "./alarm";
import type { GuAlarmProps, Http5xxAlarmProps } from "./alarm";

interface GuAlb5xxPercentageAlarmProps extends Pick<GuAlarmProps, "snsTopicName">, Http5xxAlarmProps, AppIdentity {
  loadBalancer: GuApplicationLoadBalancer;
}

interface GuUnhealthyInstancesAlarmProps extends Pick<GuAlarmProps, "snsTopicName" | "actionsEnabled">, AppIdentity {
  targetGroup: GuApplicationTargetGroup;
}

/**
 * Creates an alarm which is triggered whenever the percentage of requests with a 5xx response code exceeds
 * the specified threshold.
 */
export class GuAlb5xxPercentageAlarm extends GuAlarm {
  constructor(scope: GuStack, props: GuAlb5xxPercentageAlarmProps) {
    const mathExpression = new MathExpression({
      expression: "100*(m1+m2)/m3",
      usingMetrics: {
        m1: props.loadBalancer.metrics.httpCodeElb(HttpCodeElb.ELB_5XX_COUNT),
        m2: props.loadBalancer.metrics.httpCodeTarget(HttpCodeTarget.TARGET_5XX_COUNT),
        m3: props.loadBalancer.metrics.requestCount(),
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

    const period = Duration.minutes(1);
    const evaluationPeriods = 60;
    const evaluationInterval = Duration.minutes(period.toMinutes() * evaluationPeriods).toHumanString();

    const alarmDescription = `${props.app}'s instances have failed healthchecks several times over the last ${evaluationInterval}.
      This typically results in the AutoScaling Group cycling instances and can lead to problems with deployment,
      scaling or handling traffic spikes.

      Check ${props.app}'s application logs or ssh onto an unhealthy instance in order to debug these problems.`;
    const alarmProps: GuAlarmProps = {
      ...props,
      alarmName: alarmName,
      alarmDescription: alarmDescription,
      metric: props.targetGroup.metrics.unhealthyHostCount().with({ period, statistic: Statistic.MAXIMUM }),
      treatMissingData: TreatMissingData.NOT_BREACHING,
      threshold: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      datapointsToAlarm: 30,
      evaluationPeriods,
    };
    super(scope, AppIdentity.suffixText(props, "UnhealthyInstancesAlarm"), alarmProps);
  }
}
