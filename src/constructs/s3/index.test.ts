import { suite, test } from "node:test";
import { Template } from "aws-cdk-lib/assertions";
import { GuTemplate, simpleGuStackForTesting } from "../../utils/test";
import { GuS3Bucket } from "./index";

suite("The GuS3Bucket construct", () => {
  test("should set the bucket's policy to 'retain'", (t) => {
    const stack = simpleGuStackForTesting();

    new GuS3Bucket(stack, "MyBucket", {
      bucketName: "super-important-stuff",
      app: "test",
    });

    // The policies are siblings of Properties.
    // The `.toHaveResource` matcher cannot be used as it only looks at Properties.
    t.assert.snapshot(Template.fromStack(stack).toJSON());
  });

  test("should receive the correct set of tags", () => {
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
