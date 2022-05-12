import { Template } from "aws-cdk-lib/assertions";
import { GuTemplate, simpleGuStackForTesting } from "../../utils/test";
import { GuS3Bucket } from "./index";

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

  it("should be possible to override the logical id", () => {
    const stack = simpleGuStackForTesting();

    new GuS3Bucket(stack, "MyBucket", {
      bucketName: "data-bucket",
      app: "test",
      existingLogicalId: {
        logicalId: "DataBucket",
        reason: "Unit tests",
      },
    });

    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::S3::Bucket", "DataBucket");
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
