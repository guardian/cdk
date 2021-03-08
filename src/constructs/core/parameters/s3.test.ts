import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import type { SynthedStack } from "../../../../test/utils";
import { simpleGuStackForTesting } from "../../../../test/utils";
import { GuS3ObjectArnParameter } from "./s3";

describe("The GuS3ObjectArnParameter class", () => {
  it("should constrain input to a S3 ARN allowed pattern", () => {
    const stack = simpleGuStackForTesting();

    new GuS3ObjectArnParameter(stack, "Parameter", { description: "This is a test" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      Type: "String",
      Description: "This is a test",
      AllowedPattern: "arn:aws:s3:::(?!^(\\d{1,3}\\.){3}\\d{1,3}$)(^[a-z0-9]([a-z0-9-]*(\\.[a-z0-9])?)*$(?<!\\-))*",
      ConstraintDescription:
        "Must be a valid S3 ARN, see https://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html",
    });
  });
});
