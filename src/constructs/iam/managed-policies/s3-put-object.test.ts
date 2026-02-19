import { Template } from "aws-cdk-lib/assertions";
import { attachManagedPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuPutS3ObjectsManagedPolicy } from "./s3-put-object";

describe("The GuPutS3ObjectsManagedPolicy class", () => {
  it("sets default props", () => {
    const stack = simpleGuStackForTesting();

    const s3ManagedPolicy = new GuPutS3ObjectsManagedPolicy(stack, "S3ManagedPolicy", { bucketName: "test" });

    attachManagedPolicyToTestRole(stack, s3ManagedPolicy);

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::ManagedPolicy", {
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

  it("handles multiple paths correctly", () => {
    const stack = simpleGuStackForTesting();

    const s3ManagedPolicy = new GuPutS3ObjectsManagedPolicy(stack, "S3ManagedPolicy", {
      bucketName: "test",
      paths: ["file1.txt", "file2.txt"],
    });

    attachManagedPolicyToTestRole(stack, s3ManagedPolicy);

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::ManagedPolicy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Resource: ["arn:aws:s3:::test/file1.txt", "arn:aws:s3:::test/file2.txt"],
            Action: "s3:PutObject",
          },
        ],
      },
    });
  });
});
