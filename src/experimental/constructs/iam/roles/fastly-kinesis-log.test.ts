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

  it("allows more than one role in the stack", () => {
    const stack = simpleGuStackForTesting();
    const testStreamOne = new GuKinesisStream(stack, "testStreamOne");
    const testStreamTwo = new GuKinesisStream(stack, "testStreamTwo");

    new GuFastlyKinesisLogRoleExperimental(stack, "testKinesisLogRoleOne", {
      stream: testStreamOne,
      policyName: "writeToTestStreamPolicyOne",
      roleName: "writeToKinesisRoleTestOne",
    });

    new GuFastlyKinesisLogRoleExperimental(stack, "testKinesisLogRoleTwo", {
      stream: testStreamTwo,
      policyName: "writeToTestStreamPolicyTwo",
      roleName: "writeToKinesisRoleTestTwo",
    });

    // Assert that two separate roles exist in the stack with policies that allow writing to Kinesis
    Template.fromStack(stack).resourceCountIs("AWS::IAM::Role", 2);

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          {
            Action: ["kinesis:PutRecords", "kinesis:ListShards"],
            Effect: "Allow",
            Resource: {
              "Fn::GetAtt": ["testStreamOneE597ADBB", "Arn"],
            },
          },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "writeToTestStreamPolicyOneDD9816F1",
      Roles: [
        {
          Ref: "testKinesisLogRoleOne47025733",
        },
      ],
    });

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          {
            Action: ["kinesis:PutRecords", "kinesis:ListShards"],
            Effect: "Allow",
            Resource: {
              "Fn::GetAtt": ["testStreamTwoBFC0E912", "Arn"],
            },
          },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "writeToTestStreamPolicyTwo61962E93",
      Roles: [
        {
          Ref: "testKinesisLogRoleTwoC08DB6A6",
        },
      ],
    });
  });
});
