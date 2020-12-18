import "@aws-cdk/assert/jest";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../../test/utils";
import { GuGetS3ObjectPolicy } from "./s3-get-object";

describe("The GuGetS3ObjectPolicy class", () => {
  it("sets default props", () => {
    const stack = simpleGuStackForTesting();

    const s3Policy = new GuGetS3ObjectPolicy(stack, "S3Policy", { bucketName: "test" });

    attachPolicyToTestRole(stack, s3Policy);

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Resource: "arn:aws:s3:::test/*",
            Action: "s3:GetObject",
          },
        ],
      },
    });
  });

  it("merges defaults and passed in props", () => {
    const stack = simpleGuStackForTesting();

    const s3Policy = new GuGetS3ObjectPolicy(stack, "S3Policy", { bucketName: "test", policyName: "test" });

    attachPolicyToTestRole(stack, s3Policy);

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyName: "test",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Resource: "arn:aws:s3:::test/*",
            Action: "s3:GetObject",
          },
        ],
      },
    });
  });
});
