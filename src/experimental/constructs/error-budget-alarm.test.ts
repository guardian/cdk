import { Template } from "aws-cdk-lib/assertions";
import { MathExpression, Metric } from "aws-cdk-lib/aws-cloudwatch";
import { InstanceClass, InstanceSize, InstanceType } from "aws-cdk-lib/aws-ec2";
import { HttpCodeElb, HttpCodeTarget } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { AccessScope } from "../../constants";
import { GuEc2App } from "../../patterns";
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

  it("should create the correct resources for a simple Availability SLO", () => {
    const stack = simpleGuStackForTesting();
    const ec2App = new GuEc2App(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      userData: "#!/bin/dev foobarbaz",
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
    });
    new GuErrorBudgetAlarmExperimental(stack, {
      sloName: "MapiFrontsAvailability",
      sloTarget: 0.999,
      badEvents: new MathExpression({
        expression: "loadBalancer5xxErrors + instance5xxErrors",
        usingMetrics: {
          loadBalancer5xxErrors: ec2App.loadBalancer.metricHttpCodeTarget(HttpCodeTarget.TARGET_5XX_COUNT),
          instance5xxErrors: ec2App.loadBalancer.metricHttpCodeElb(HttpCodeElb.ELB_5XX_COUNT),
        },
      }),
      validEvents: ec2App.loadBalancer.metricRequestCount(),
      snsTopicNameForAlerts: "test-sns-topic",
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should create the correct resources for a simple Latency SLO", () => {
    const stack = simpleGuStackForTesting();
    const ec2App = new GuEc2App(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      userData: "#!/bin/dev foobarbaz",
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
    });
    new GuErrorBudgetAlarmExperimental(stack, {
      sloName: "MapiFrontsLatency",
      sloTarget: 0.999,
      badEvents: ec2App.loadBalancer.metricTargetResponseTime({
        statistic: "TC(0.5:)", // This gets a count of slow requests i.e. the number of requests that completed in 0.5 seconds or more
      }),
      validEvents: ec2App.loadBalancer.metricRequestCount(),
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
