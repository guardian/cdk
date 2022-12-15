import { Template } from "aws-cdk-lib/assertions";
import { GuTemplate, simpleGuStackForTesting } from "../../utils/test";
import { GuS3Bucket, GuS3OriginBucket } from "./index";

describe("The GuS3Bucket construct", () => {
  it("should set the bucket's policy to 'retain'", () => {
    const stack = simpleGuStackForTesting();

    new GuS3Bucket(stack, "MyBucket", {
      bucketName: "super-important-stuff",
      app: "test",
    });

    // The policies are siblings of Properties.
    // The `.toHaveResource` matcher cannot be used as it only looks at Properties.
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should receive the correct set of tags", () => {
    const stack = simpleGuStackForTesting();
    const app = "test";

    new GuS3Bucket(stack, "MyBucket", {
      bucketName: "super-important-stuff",
      app,
    });

    GuTemplate.fromStack(stack).hasGuTaggedResource("AWS::S3::Bucket", {
      appIdentity: { app },
    });
  });
});

describe("The GuS3OriginBucket construct", () => {
  it("should create a stage aware SSM parameter by default", () => {
    const stack = simpleGuStackForTesting();
    const app = "wordiply";

    new GuS3OriginBucket(stack, `${app}-origin`, {
      app,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::SSM::Parameter", {
      Name: "/TEST/test-stack/wordiply/wordiply-origin-bucket",
    });
  });

  it("should be configurable to be stage agnostic", () => {
    const stack = simpleGuStackForTesting();
    const app = "wordiply";

    new GuS3OriginBucket(stack, `${app}-origin`, {
      app,
      withoutStageAwareness: true,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::SSM::Parameter", {
      Name: "/test-stack/wordiply/wordiply-origin-bucket",
    });
  });
});
