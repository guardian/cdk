import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { GuStack } from "../../core";
import { GuAllowPolicy } from "./base-policy";
import type { GuAllowPolicyProps } from "./base-policy";

abstract class GuCloudwatchPolicy extends GuAllowPolicy {
  protected constructor(scope: GuStack, id: string, props: Omit<GuAllowPolicyProps, "resources">) {
    super(scope, id, {
      ...props,
      actions: props.actions.map((action) => `cloudwatch:${action}`),
      resources: ["*"],
    });
  }
}

export class GuGetCloudwatchMetricsPolicy extends GuCloudwatchPolicy {
  static buildStatements(): PolicyStatement[] {
    return [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["cloudwatch:ListMetrics", "cloudwatch:GetMetricData", "cloudwatch:GetMetricStatistics", "cloudwatch:DescribeAlarmsForMetric"],
        resources: ["*"],
      }),
    ];
  }

  constructor(scope: GuStack) {
    super(scope, "GuGetCloudwatchMetricsPolicy", {
      actions: ["ListMetrics", "GetMetricData", "GetMetricStatistics", "DescribeAlarmsForMetric"],
    });
  }
}

export class GuPutCloudwatchMetricsPolicy extends GuCloudwatchPolicy {
  static buildStatements(): PolicyStatement[] {
    return [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
      }),
    ];
  }

  constructor(scope: GuStack) {
    super(scope, "GuPutCloudwatchMetricsPolicy", { actions: ["PutMetricData"] });
  }
}
