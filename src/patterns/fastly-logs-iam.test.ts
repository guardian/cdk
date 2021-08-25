import "@aws-cdk/assert/jest";
import {simpleGuStackForTesting} from "../utils/test";
import {GuFastlyLogsIam} from "./fastly-logs-iam";

describe("The GuFastlyLogsIam pattern", () => {

  it("correctly wires up the policy",  () => {
    const stack = simpleGuStackForTesting();
    new GuFastlyLogsIam(stack, "iam", {
        bucketName: "test",
        path: "",
      });
    expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Resource: "arn:aws:s3:::test/*",
            Action: "s3:PutObject",
          },
        ],
      },
    });
  });
});
