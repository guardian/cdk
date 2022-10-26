import { Template } from "aws-cdk-lib/assertions";
import { MathExpression, Metric } from "aws-cdk-lib/aws-cloudwatch";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuErrorBudgetAlarmExperimental } from "./error-budget-alarm";

describe("The ErrorBudgetAlarmExperimental construct", () => {
  it("should create the correct resources with basic config", () => {
    const stack = simpleGuStackForTesting();
    new GuErrorBudgetAlarmExperimental(stack, {
      sloName: "MapiFrontsAvailability",
      sloTarget: 0.999,
      badEvents: new Metric({ metricName: "HttpErrors", namespace: "TestLoadBalancerMetrics" }),
      validEvents: new Metric({ metricName: "HttpRequests", namespace: "TestLoadBalancerMetrics" }),
      snsTopicNameForAlerts: "test-sns-topic",
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should accept math expressions for more complicated definitions of bad/valid events", () => {
    const stack = simpleGuStackForTesting();
    new GuErrorBudgetAlarmExperimental(stack, {
      sloName: "MapiFrontsAvailability",
      sloTarget: 0.999,
      badEvents: new MathExpression({
        expression: "loadBalancerErrors + targetErrors",
        usingMetrics: {
          loadBalancerErrors: new Metric({ metricName: "LbHttpErrors", namespace: "TestLoadBalancerMetrics" }),
          targetErrors: new Metric({ metricName: "TargetHttpErrors", namespace: "TestTargetMetrics" }),
        },
      }),
      validEvents: new MathExpression({
        expression: "allRequests - invalidRequests",
        usingMetrics: {
          allRequests: new Metric({ metricName: "HttpRequests", namespace: "TestLoadBalancerMetrics" }),
          invalidRequests: new Metric({ metricName: "BadRequests", namespace: "TestLoadBalancerMetrics" }),
        },
      }),
      snsTopicNameForAlerts: "test-sns-topic",
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
