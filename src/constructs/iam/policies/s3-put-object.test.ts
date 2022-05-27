import { Template } from "aws-cdk-lib/assertions";
import { attachPolicyToTestRole, simpleTestingResources } from "../../../utils/test";
import { GuPutS3ObjectsPolicy } from "./s3-put-object";

describe("The GuPutS3ObjectPolicy class", () => {
  it("sets default props", () => {
    const { stack, app } = simpleTestingResources();

    const s3Policy = new GuPutS3ObjectsPolicy(app, "S3Policy", { bucketName: "test" });

    attachPolicyToTestRole(stack, s3Policy);

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
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

  it("merges defaults and passed in props", () => {
    const { stack, app } = simpleTestingResources();

    const s3Policy = new GuPutS3ObjectsPolicy(app, "S3Policy", { bucketName: "test", policyName: "test" });

    attachPolicyToTestRole(stack, s3Policy);

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyName: "test",
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
    const { stack, app } = simpleTestingResources();

    const s3Policy = new GuPutS3ObjectsPolicy(app, "S3Policy", {
      bucketName: "test",
      paths: ["file1.txt", "file2.txt"],
    });

    attachPolicyToTestRole(stack, s3Policy);

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
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
