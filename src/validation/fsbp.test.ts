import { App, Validations } from "aws-cdk-lib";
import { BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import { GuStack } from "../constructs/core";
import type { GuS3BucketProps } from "../constructs/s3";
import { GuS3Bucket } from "../constructs/s3";

describe("GuFsbpValidationPlugin", () => {
  const appWithBucket = (props: Partial<GuS3BucketProps> = {}) => {
    const app = new App();
    const stack = new GuStack(app, "Test", { stack: "test-stack", stage: "TEST" });
    const bucket = new GuS3Bucket(stack, "Bucket", { app: "test-app", ...props });
    return { app, bucket };
  };

  const allowPublicPolicy = new BlockPublicAccess({
    blockPublicAcls: true,
    ignorePublicAcls: true,
    blockPublicPolicy: false,
    restrictPublicBuckets: true,
  });

  it("passes a bucket that blocks all public access", () => {
    const { app } = appWithBucket();
    expect(() => app.synth()).not.toThrow();
  });

  it("fails synthesis when a bucket does not block public policies (FSBP S3.3)", () => {
    const { app } = appWithBucket({ blockPublicAccess: allowPublicPolicy });
    expect(() => app.synth()).toThrow(
      /S3\.3: S3 general purpose buckets should block public write access[\s\S]*FSBP::S3_BUCKET_PUBLIC_WRITE_PROHIBITED/,
    );
  });

  it("can be acknowledged", () => {
    const { app, bucket } = appWithBucket({ blockPublicAccess: allowPublicPolicy });
    Validations.of(bucket).acknowledge(
      { id: "FSBP::S3_BUCKET_PUBLIC_READ_PROHIBITED", reason: "Serves public assets" },
      { id: "FSBP::S3_BUCKET_PUBLIC_WRITE_PROHIBITED", reason: "Serves public assets" },
    );
    expect(() => app.synth()).not.toThrow();
  });
});
