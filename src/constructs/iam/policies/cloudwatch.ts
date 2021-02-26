import type { GuStack } from "../../core";
import type { GuAllowPolicyProps } from "./base-policy";
import { GuAllowPolicy } from "./base-policy";

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
  constructor(scope: GuStack, id: string = "GuGetCloudwatchMetricsPolicy") {
    super(scope, id, { actions: ["ListMetrics", "GetMetricData", "GetMetricStatistics", "DescribeAlarmsForMetric"] });
  }
}

export class GuPutCloudwatchMetricsPolicy extends GuCloudwatchPolicy {
  constructor(scope: GuStack, id: string = "GuPutCloudwatchMetricsPolicy") {
    super(scope, id, { actions: ["PutMetricData"] });
  }
}
