import { Template } from "aws-cdk-lib/assertions";
import { attachPolicyToTestRole, simpleTestingResources } from "../../../utils/test";
import { GuGetCloudwatchMetricsPolicy, GuPutCloudwatchMetricsPolicy } from "./cloudwatch";

describe("The GuGetCloudwatchMetricsPolicy construct", () => {
  it("creates the correct policy", () => {
    const { stack, app } = simpleTestingResources();
    attachPolicyToTestRole(stack, new GuGetCloudwatchMetricsPolicy(app));

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
    const { stack, app } = simpleTestingResources();
    attachPolicyToTestRole(stack, new GuPutCloudwatchMetricsPolicy(app));

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
