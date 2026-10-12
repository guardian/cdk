import { strictEqual } from "node:assert";
import { suite, test } from "node:test";
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

suite("The GuAppAwareConstruct mixin", () => {
  // demonstrates usage of `GuAppAwareConstruct`
  test("should throw if no app identifier is provided", (t) => {
    const stack = simpleGuStackForTesting();

    t.assert.throws(() => {
      new TestConstruct(stack, "MyBucket", {});
    }, /Cannot use the GuAppAwareConstruct mixin without an AppIdentity/);
  });

  test("should suffix the id with the app identifier", () => {
    const stack = simpleGuStackForTesting();
    const bucket = new TestAppAwareConstruct(stack, "MyBucket", { app: "Test" });

    strictEqual(bucket.idWithApp, "MyBucketTest");
  });

  test("should add the app tag", (t) => {
    const stack = simpleGuStackForTesting();
    new TestAppAwareConstruct(stack, "MyBucket", { app: "Test" });
    t.assert.snapshot(Template.fromStack(stack).toJSON());
  });
});
