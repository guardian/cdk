import { Duration } from "aws-cdk-lib";
import type { RestApi } from "aws-cdk-lib/aws-apigateway";
import { ComparisonOperator, MathExpression, TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import type { GuStack } from "../core";
import { AppIdentity } from "../core";
import type { GuAlarmProps, Http5xxAlarmProps } from "./alarm";
import { GuAlarm } from "./alarm";

interface GuApiGateway5xxPercentageAlarmProps
  extends Pick<GuAlarmProps, "snsTopicName">,
    Http5xxAlarmProps,
    AppIdentity {
  apiGatewayInstance: RestApi;
}

/**
 * Creates an alarm which is triggered whenever the percentage of requests with a 5xx response code exceeds
 * the specified threshold.
 */
export class GuApiGateway5xxPercentageAlarm extends GuAlarm {
  constructor(scope: GuStack, props: GuApiGateway5xxPercentageAlarmProps) {
    const mathExpression = new MathExpression({
      expression: "100*m1/m2",
      usingMetrics: {
        m1: props.apiGatewayInstance.metricServerError(),
        m2: props.apiGatewayInstance.metricCount(),
      },
      label: `% of 5XX responses served for ${props.app}`,
      period: Duration.minutes(1),
    });
    const defaultAlarmName = `High 5XX error % from ${props.app} (ApiGateway) in ${scope.stage}`;
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
    super(scope, AppIdentity.suffixText(props, "ApiGatewayHigh5xxPercentageAlarm"), alarmProps);
  }
}
