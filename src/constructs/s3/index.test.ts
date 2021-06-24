import { SynthUtils } from "@aws-cdk/assert";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuS3Bucket } from "./index";

describe("The GuS3Bucket construct", () => {
  it("should set the bucket's policy to 'retain'", () => {
    const stack = simpleGuStackForTesting();

    new GuS3Bucket(stack, "MyBucket", {
      bucketName: "super-important-stuff",
    });

    // The policies are siblings of Properties.
    // The `.toHaveResource` matcher cannot be used as it only looks at Properties.
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});
