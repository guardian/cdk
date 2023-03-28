import { Template } from "aws-cdk-lib/assertions";
import { FASTLY_AWS_ACCOUNT_ID } from "../../../../constants";
import { GuKinesisStream } from "../../../../constructs/kinesis";
import { simpleGuStackForTesting } from "../../../../utils/test";
import { GuFastlyKinesisLogRoleExperimental } from "./fastly-kinesis-log";

describe("The GuFastlyKinesisLogRole construct", () => {
  it("correctly wires up the policy", () => {
    const stack = simpleGuStackForTesting();
    const testStream = new GuKinesisStream(stack, "testStream");
    new GuFastlyKinesisLogRoleExperimental(stack, "testKinesisLogRole", {
      stream: testStream,
      roleName: "writeToKinesisRoleTest",
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("assumes the correct role", () => {
    const stack = simpleGuStackForTesting();
    const testStream = new GuKinesisStream(stack, "testStream");
    new GuFastlyKinesisLogRoleExperimental(stack, "testKinesisLogRole", {
      stream: testStream,
      roleName: "writeToKinesisRoleTest",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "sts:AssumeRole",
            Condition: {
              StringEquals: {
                "sts:ExternalId": {
                  Ref: "FastlyCustomerId",
                },
              },
            },
            Effect: "Allow",
            Principal: {
              AWS: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition",
                    },
                    `:iam::${FASTLY_AWS_ACCOUNT_ID}:root`,
                  ],
                ],
              },
            },
          },
        ],
      },
    });
  });
});
