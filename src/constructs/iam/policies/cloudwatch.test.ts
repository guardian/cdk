import { suite, test } from "node:test";
import { Template } from "aws-cdk-lib/assertions";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuGetCloudwatchMetricsPolicy, GuPutCloudwatchMetricsPolicy } from "./cloudwatch";

suite("The GuGetCloudwatchMetricsPolicy construct", () => {
  test("creates the correct policy", () => {
    const stack = simpleGuStackForTesting();
    attachPolicyToTestRole(stack, new GuGetCloudwatchMetricsPolicy(stack));

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: [
              "cloudwatch:ListMetrics",
              "cloudwatch:GetMetricData",
              "cloudwatch:GetMetricStatistics",
              "cloudwatch:DescribeAlarmsForMetric",
            ],
            Effect: "Allow",
            Resource: "*",
          },
        ],
      },
    });
  });
});

suite("The GuPutCloudwatchMetricsPolicy construct", () => {
  test("creates the correct policy", () => {
    const stack = simpleGuStackForTesting();
    attachPolicyToTestRole(stack, new GuPutCloudwatchMetricsPolicy(stack));

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "cloudwatch:PutMetricData",
            Effect: "Allow",
            Resource: "*",
          },
        ],
      },
    });
  });
});
