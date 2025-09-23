import { Template } from "aws-cdk-lib/assertions";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuDynamoDBReadPolicy, GuDynamoDBWritePolicy } from "./dynamodb";

describe("The GuDynamoDBReadPolicy construct", () => {
  it("creates the correct policy", () => {
    const stack = simpleGuStackForTesting();
    attachPolicyToTestRole(stack, new GuDynamoDBReadPolicy(stack, "ReadMyTablePolicy", { tableName: "MyTable" }));

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyName: "ReadMyTablePolicyBE0064AB",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: [
              "dynamodb:BatchGetItem",
              "dynamodb:GetItem",
              "dynamodb:Scan",
              "dynamodb:Query",
              "dynamodb:GetRecords",
            ],
            Effect: "Allow",
            Resource: [
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:dynamodb:eu-west-1:",
                    {
                      Ref: "AWS::AccountId",
                    },
                    ":table/MyTable",
                  ],
                ],
              },
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:dynamodb:eu-west-1:",
                    {
                      Ref: "AWS::AccountId",
                    },
                    ":table/MyTable/index/*",
                  ],
                ],
              },
            ],
          },
        ],
      },
    });
  });
});

describe("The GuDynamoDBWritePolicy construct", () => {
  it("creates the correct policy", () => {
    const stack = simpleGuStackForTesting();
    attachPolicyToTestRole(stack, new GuDynamoDBWritePolicy(stack, "WriteMyTablePolicy", { tableName: "MyTable" }));

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyName: "WriteMyTablePolicy7D2601F8",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: ["dynamodb:BatchWriteItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:UpdateItem"],
            Effect: "Allow",
            Resource: [
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:dynamodb:eu-west-1:",
                    {
                      Ref: "AWS::AccountId",
                    },
                    ":table/MyTable",
                  ],
                ],
              },
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:dynamodb:eu-west-1:",
                    {
                      Ref: "AWS::AccountId",
                    },
                    ":table/MyTable/index/*",
                  ],
                ],
              },
            ],
          },
        ],
      },
    });
  });
});
