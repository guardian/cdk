import { Template } from "aws-cdk-lib/assertions";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuGetCloudwatchMetricsPolicy, GuPutCloudwatchMetricsPolicy } from "./cloudwatch";

describe("The GuGetCloudwatchMetricsPolicy construct", () => {
  it("creates the correct policy", () => {
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

describe("The GuPutCloudwatchMetricsPolicy construct", () => {
  it("creates the correct policy", () => {
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
