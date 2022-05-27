import type { GuApp } from "../../core";
import { GuAllowPolicy } from "./base-policy";
import type { GuAllowPolicyProps } from "./base-policy";

abstract class GuCloudwatchPolicy extends GuAllowPolicy {
  protected constructor(scope: GuApp, id: string, props: Omit<GuAllowPolicyProps, "resources">) {
    super(scope, id, {
      ...props,
      actions: props.actions.map((action) => `cloudwatch:${action}`),
      resources: ["*"],
    });
  }
}

export class GuGetCloudwatchMetricsPolicy extends GuCloudwatchPolicy {
  constructor(scope: GuApp) {
    super(scope, "GuGetCloudwatchMetricsPolicy", {
      actions: ["ListMetrics", "GetMetricData", "GetMetricStatistics", "DescribeAlarmsForMetric"],
    });
  }
}

export class GuPutCloudwatchMetricsPolicy extends GuCloudwatchPolicy {
  constructor(scope: GuApp) {
    super(scope, "GuPutCloudwatchMetricsPolicy", { actions: ["PutMetricData"] });
  }
}
