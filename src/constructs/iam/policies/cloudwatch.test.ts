import "@aws-cdk/assert/jest";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../../test/utils";
import { GuGetCloudwatchMetricsPolicy, GuPutCloudwatchMetricsPolicy } from "./cloudwatch";

describe("The GuGetCloudwatchMetricsPolicy construct", () => {
  it("creates the correct policy", () => {
    const stack = simpleGuStackForTesting();
    attachPolicyToTestRole(stack, new GuGetCloudwatchMetricsPolicy(stack));

    expect(stack).toHaveResource("AWS::IAM::Policy", {
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

describe("The GuPutCloudwatchMetricsPolicy construct", () => {
  it("creates the correct policy", () => {
    const stack = simpleGuStackForTesting();
    attachPolicyToTestRole(stack, new GuPutCloudwatchMetricsPolicy(stack));

    expect(stack).toHaveResource("AWS::IAM::Policy", {
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
