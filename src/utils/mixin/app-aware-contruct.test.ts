import { Template } from "aws-cdk-lib/assertions";
import type { BucketProps } from "aws-cdk-lib/aws-s3";
import { Bucket } from "aws-cdk-lib/aws-s3";
import type { AppIdentity, GuStack } from "../../constructs/core";
import { simpleGuStackForTesting } from "../test";
import { GuAppAwareConstruct } from "./app-aware-construct";

// `GuAppAwareConstruct` should only operate if `props` has an `app` property,
// so usage here should be a no-op.
class TestConstruct extends GuAppAwareConstruct(Bucket) {
  constructor(scope: GuStack, id: string, props: BucketProps) {
    super(scope, id, props);
  }
}

interface TestAppAwareConstructProps extends BucketProps, AppIdentity {}

class TestAppAwareConstruct extends GuAppAwareConstruct(Bucket) {
  constructor(scope: GuStack, id: string, props: TestAppAwareConstructProps) {
    super(scope, id, props);
  }
}

describe("The GuAppAwareConstruct mixin", () => {
  // demonstrates usage of `GuAppAwareConstruct`
  it("should throw if no app identifier is provided", () => {
    const stack = simpleGuStackForTesting();

    expect(() => {
      new TestConstruct(stack, "MyBucket", {});
    }).toThrowError("Cannot use the GuAppAwareConstruct mixin without an AppIdentity");
  });

  it("should suffix the id with the app identifier", () => {
    const stack = simpleGuStackForTesting();
    const bucket = new TestAppAwareConstruct(stack, "MyBucket", { app: "Test" });

    expect(bucket.idWithApp).toBe("MyBucketTest");
  });

  it("should add the app tag", () => {
    const stack = simpleGuStackForTesting();
    new TestAppAwareConstruct(stack, "MyBucket", { app: "Test" });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
