import { Template } from "aws-cdk-lib/assertions";
import { GuTemplate, simpleTestingResources } from "../../utils/test";
import { GuS3Bucket } from "./index";

describe("The GuS3Bucket construct", () => {
  it("should set the bucket's policy to 'retain'", () => {
    const { stack, app } = simpleTestingResources({ appName: "test" });

    new GuS3Bucket(app, "MyBucket", {
      bucketName: "super-important-stuff",
    });

    // The policies are siblings of Properties.
    // The `.toHaveResource` matcher cannot be used as it only looks at Properties.
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should receive the correct set of tags", () => {
    const { stack, app } = simpleTestingResources();

    new GuS3Bucket(app, "MyBucket", {
      bucketName: "super-important-stuff",
    });

    GuTemplate.fromStack(stack).hasGuTaggedResource("AWS::S3::Bucket", {
      app,
    });
  });
});
