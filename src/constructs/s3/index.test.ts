import "../../utils/test/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { simpleGuStackForTesting } from "../../utils/test";
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
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should be possible to override the logical id", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });

    new GuS3Bucket(stack, "MyBucket", {
      bucketName: "data-bucket",
      app: "test",
      existingLogicalId: {
        logicalId: "DataBucket",
        reason: "Unit tests",
      },
    });

    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::S3::Bucket", "DataBucket");
  });

  it("should receive the correct set of tags", () => {
    const stack = simpleGuStackForTesting();
    const app = "test";

    new GuS3Bucket(stack, "MyBucket", {
      bucketName: "super-important-stuff",
      app,
    });

    expect(stack).toHaveGuTaggedResource("AWS::S3::Bucket", {
      appIdentity: { app },
    });
  });
});
