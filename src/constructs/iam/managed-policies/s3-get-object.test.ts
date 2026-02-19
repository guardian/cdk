import { Template } from "aws-cdk-lib/assertions";
import { attachManagedPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuGetDistributableManagedPolicy, GuGetS3ObjectsManagedPolicy } from "./s3-get-object";

describe("The GuGetS3ObjectsManagedPolicy class", () => {
  it("sets default props", () => {
    const stack = simpleGuStackForTesting();

    const s3ManagedPolicy = new GuGetS3ObjectsManagedPolicy(stack, "S3ManagedPolicy", { bucketName: "test" });

    attachManagedPolicyToTestRole(stack, s3ManagedPolicy);

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::ManagedPolicy", {
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

  it("handles multiple paths correctly", () => {
    const stack = simpleGuStackForTesting();

    const s3ManagedPolicy = new GuGetS3ObjectsManagedPolicy(stack, "S3ManagedPolicy", {
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
            Action: "s3:GetObject",
          },
        ],
      },
    });
  });
});

describe("The GuGetDistributableManagedPolicy construct", () => {
  it("creates the correct managed policy", () => {
    const stack = simpleGuStackForTesting();
    attachManagedPolicyToTestRole(stack, new GuGetDistributableManagedPolicy(stack, { app: "testing" }));

    const template = Template.fromStack(stack);

    template.hasParameter("DistributionBucketName", {
      Default: "/account/services/artifact.bucket",
      Description: "SSM parameter containing the S3 bucket name holding distribution artifacts",
      Type: "AWS::SSM::Parameter::Value<String>",
    });

    template.hasResourceProperties("AWS::IAM::ManagedPolicy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "s3:GetObject",
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:aws:s3:::",
                  {
                    Ref: "DistributionBucketName",
                  },
                  "/test-stack/TEST/testing/*",
                ],
              ],
            },
          },
        ],
      },
    });
  });
});
