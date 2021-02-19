import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import type { SynthedStack } from "../../../../test/utils";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../../test/utils";
import { GuDistributionBucketParameter } from "../../core";
import { GuGetDistributablePolicy, GuGetS3ObjectPolicy } from "./s3-get-object";

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

describe("The GuGetDistributablePolicy construct", () => {
  it("creates the correct policy", () => {
    const stack = simpleGuStackForTesting();
    attachPolicyToTestRole(stack, new GuGetDistributablePolicy(stack));

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    const parameterKeys = Object.keys(json.Parameters);
    const expectedKeys = ["Stage", GuDistributionBucketParameter.parameterName];
    expect(parameterKeys).toEqual(expectedKeys);

    expect(json.Parameters.DistributionBucketName).toEqual({
      Default: "/account/services/artifact.bucket",
      Description: "SSM parameter containing the S3 bucket name holding distribution artifacts",
      Type: "AWS::SSM::Parameter::Value<String>",
    });

    expect(stack).toHaveResource("AWS::IAM::Policy", {
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
                  "/*",
                ],
              ],
            },
          },
        ],
      },
    });
  });
});
