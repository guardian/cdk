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

  it("should fail to create Alarm when slo target is above 99.95%", () => {
    const stack = simpleGuStackForTesting();
    expect(() => {
      new GuErrorBudgetAlarmExperimental(stack, {
        sloName: "MapiFrontsAvailability",
        sloTarget: 0.9996,
        badEvents: new Metric({ metricName: "HttpErrors", namespace: "TestLoadBalancerMetrics" }),
        validEvents: new Metric({ metricName: "HttpRequests", namespace: "TestLoadBalancerMetrics" }),
        snsTopicNameForAlerts: "test-sns-topic",
      });
    }).toThrowError("ErrorBudgetAlarm only works with SLO targets between 0.95 and 0.9995");
  });

  it("should fail to create Alarm when slo target is below 95%", () => {
    const stack = simpleGuStackForTesting();
    expect(() => {
      new GuErrorBudgetAlarmExperimental(stack, {
        sloName: "MapiFrontsAvailability",
        sloTarget: 0.9499,
        badEvents: new Metric({ metricName: "HttpErrors", namespace: "TestLoadBalancerMetrics" }),
        validEvents: new Metric({ metricName: "HttpRequests", namespace: "TestLoadBalancerMetrics" }),
        snsTopicNameForAlerts: "test-sns-topic",
      });
    }).toThrowError("ErrorBudgetAlarm only works with SLO targets between 0.95 and 0.9995");
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

  it("should support multiple GuErrorBudgetAlarmExperimentals in a single stack", () => {
    const stack = simpleGuStackForTesting();
    new GuErrorBudgetAlarmExperimental(stack, {
      sloName: "MapiFrontsAvailability",
      sloTarget: 0.999,
      badEvents: new Metric({ metricName: "HttpErrors", namespace: "TestLoadBalancerMetrics" }),
      validEvents: new Metric({ metricName: "HttpRequests", namespace: "TestLoadBalancerMetrics" }),
      snsTopicNameForAlerts: "test-sns-topic",
    });
    new GuErrorBudgetAlarmExperimental(stack, {
      sloName: "MapiFrontsLatency",
      sloTarget: 0.999,
      badEvents: new Metric({ metricName: "SlowResponses", namespace: "TestLoadBalancerMetrics" }),
      validEvents: new Metric({ metricName: "HttpRequests", namespace: "TestLoadBalancerMetrics" }),
      snsTopicNameForAlerts: "test-sns-topic",
    });
    // Each GuErrorBudgetAlarmExperimental creates 3 composite alarms (fast, medium, slow) so we expect 6 in total here
    Template.fromStack(stack).resourceCountIs("AWS::CloudWatch::CompositeAlarm", 6);
  });
});
