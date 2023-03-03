import { Template } from "aws-cdk-lib/assertions";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuKinesisStream } from "../../kinesis";
import { GuKinesisPutRecordsPolicy } from "./kinesis-put-records";

describe("The GuKinesisPutRecordsPolicy class", () => {
  it("has the correct action permissions", () => {
    const stack = simpleGuStackForTesting();
    const stream = new GuKinesisStream(stack, "testStream");

    const kinesisPutRecordsPolicy = new GuKinesisPutRecordsPolicy(stack, "KinesisPolicy", { stream });

    attachPolicyToTestRole(stack, kinesisPutRecordsPolicy);

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["kinesis:PutRecords", "kinesis:ListShards"],
            Resource: { "Fn::GetAtt": ["testStream8BCA7523", "Arn"] },
          },
        ],
      },
    });
  });
});
