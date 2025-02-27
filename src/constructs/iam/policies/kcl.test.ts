import { Template } from "aws-cdk-lib/assertions";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuKCLPolicy } from "./kcl";

describe("GuKCLPolicy", () => {
  it("should create a policy granting sufficient permissions for the KCL", () => {
    const stack = simpleGuStackForTesting();

    const policy = new GuKCLPolicy(stack, "StreamFooKCLPolicy", { streamName: "streamFoo", applicationName: "appBar" });

    attachPolicyToTestRole(stack, policy);

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyName: "StreamFooKCLPolicy36019522",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: [
              "kinesis:DescribeStream",
              "kinesis:DescribeStreamSummary",
              "kinesis:RegisterStreamConsumer",
              "kinesis:GetRecords",
              "kinesis:GetShardIterator",
              "kinesis:ListShards",
            ],
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                ["arn:aws:kinesis:", { Ref: "AWS::Region" }, ":", { Ref: "AWS::AccountId" }, ":stream/streamFoo"],
              ],
            },
          },
          {
            Action: ["kinesis:SubscribeToShard", "kinesis:DescribeStreamConsumer"],
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:aws:kinesis:",
                  { Ref: "AWS::Region" },
                  ":",
                  { Ref: "AWS::AccountId" },
                  ":stream/streamFoo/consumer/*",
                ],
              ],
            },
          },
          {
            Action: [
              "dynamodb:Scan",
              "dynamodb:CreateTable",
              "dynamodb:DescribeTable",
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:DeleteItem",
            ],
            Effect: "Allow",
            Resource: [
              {
                "Fn::Join": [
                  "",
                  ["arn:aws:dynamodb:", { Ref: "AWS::Region" }, ":", { Ref: "AWS::AccountId" }, ":table/appBar"],
                ],
              },
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:dynamodb:",
                    { Ref: "AWS::Region" },
                    ":",
                    { Ref: "AWS::AccountId" },
                    ":table/appBar-WorkerMetricStats",
                  ],
                ],
              },
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:dynamodb:",
                    { Ref: "AWS::Region" },
                    ":",
                    { Ref: "AWS::AccountId" },
                    ":table/appBar-CoordinatorState",
                  ],
                ],
              },
            ],
          },
          {
            Action: "dynamodb:UpdateTable",
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                ["arn:aws:dynamodb:", { Ref: "AWS::Region" }, ":", { Ref: "AWS::AccountId" }, ":table/appBar"],
              ],
            },
          },
          {
            Action: "dynamodb:Query",
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                ["arn:aws:dynamodb:", { Ref: "AWS::Region" }, ":", { Ref: "AWS::AccountId" }, ":table/appBar/index/*"],
              ],
            },
          },
          {
            Action: "cloudwatch:PutMetricData",
            Effect: "Allow",
            Resource: {
              "Fn::Join": ["", ["arn:aws:cloudwatch:", { Ref: "AWS::Region" }, ":", { Ref: "AWS::AccountId" }, ":*"]],
            },
          },
        ],
      },
    });
  });
});
