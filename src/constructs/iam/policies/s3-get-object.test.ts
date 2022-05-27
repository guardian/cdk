import { Template } from "aws-cdk-lib/assertions";
import { attachPolicyToTestRole, simpleTestingResources } from "../../../utils/test";
import { GuGetDistributablePolicy, GuGetS3ObjectsPolicy } from "./s3-get-object";

describe("The GuGetS3ObjectPolicy class", () => {
  it("sets default props", () => {
    const { stack, app } = simpleTestingResources();

    const s3Policy = new GuGetS3ObjectsPolicy(app, "S3Policy", { bucketName: "test" });

    attachPolicyToTestRole(stack, s3Policy);

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
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
    const { stack, app } = simpleTestingResources();

    const s3Policy = new GuGetS3ObjectsPolicy(app, "S3Policy", { bucketName: "test", policyName: "test" });

    attachPolicyToTestRole(stack, s3Policy);

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
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

  it("handles multiple paths correctly", () => {
    const { stack, app } = simpleTestingResources();

    const s3Policy = new GuGetS3ObjectsPolicy(app, "S3Policy", {
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
            Action: "s3:GetObject",
          },
        ],
      },
    });
  });
});

describe("The GuGetDistributablePolicy construct", () => {
  it("creates the correct policy", () => {
    const { stack, app } = simpleTestingResources();
    attachPolicyToTestRole(stack, new GuGetDistributablePolicy(app));

    const template = Template.fromStack(stack);

    template.hasParameter("DistributionBucketName", {
      Default: "/account/services/artifact.bucket",
      Description: "SSM parameter containing the S3 bucket name holding distribution artifacts",
      Type: "AWS::SSM::Parameter::Value<String>",
    });

    template.hasResourceProperties("AWS::IAM::Policy", {
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
