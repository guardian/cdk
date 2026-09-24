import { App, Validations } from "aws-cdk-lib";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { GuStack } from "../constructs/core";

describe("GuFsbpValidationPlugin", () => {
  const appWithBucket = (blockPublicAccess?: BlockPublicAccess) => {
    const app = new App();
    const stack = new GuStack(app, "Test", { stack: "test-stack", stage: "TEST" });
    const bucket = new Bucket(stack, "Bucket", { blockPublicAccess });
    return { app, bucket };
  };

  it("passes a bucket with the default public access block", () => {
    const { app } = appWithBucket();
    expect(() => app.synth()).not.toThrow();
  });

  it("fails synthesis when a bucket allows public read (FSBP S3.2)", () => {
    const { app, bucket } = appWithBucket(BlockPublicAccess.BLOCK_ACLS_ONLY);
    bucket.grantPublicAccess("public/*");
    expect(() => app.synth()).toThrow(/FSBP::S3_BUCKET_PUBLIC_READ_PROHIBITED/);
  });

  it("can be acknowledged", () => {
    const { app, bucket } = appWithBucket(BlockPublicAccess.BLOCK_ACLS_ONLY);
    bucket.grantPublicAccess("public/*");
    Validations.of(bucket).acknowledge(
      { id: "FSBP::S3_BUCKET_PUBLIC_READ_PROHIBITED", reason: "Serves public assets" },
      { id: "FSBP::S3_BUCKET_PUBLIC_WRITE_PROHIBITED", reason: "Serves public assets" },
    );
    expect(() => app.synth()).not.toThrow();
  });
});
