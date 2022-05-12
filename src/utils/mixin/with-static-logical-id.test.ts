import { Template } from "aws-cdk-lib/assertions";
import type { BucketProps } from "aws-cdk-lib/aws-s3";
import { Bucket } from "aws-cdk-lib/aws-s3";
import type { GuMigratingResource, GuStack } from "../../constructs/core";
import { GuTemplate, simpleGuStackForTesting } from "../test";
import { WithStaticLogicalId } from "./with-static-logical-id";

describe("The WithStaticLogicalId mixin", () => {
  class PlainBucket extends WithStaticLogicalId(Bucket) {
    constructor(scope: GuStack, id: string, props: BucketProps) {
      super(scope, id, props);
    }
  }

  interface MigratableBucketProps extends BucketProps, GuMigratingResource {}
  class MigratableBucket extends WithStaticLogicalId(Bucket) {
    constructor(scope: GuStack, id: string, props: MigratableBucketProps) {
      super(scope, id, props);
    }
  }

  it("should continue to add a Construct w/out `existingLogicalId` props (i.e. incorrect use) to the stack", () => {
    const stack = simpleGuStackForTesting();
    new PlainBucket(stack, "MyBucket", {});

    Template.fromStack(stack).hasResource("AWS::S3::Bucket", {}); // Resource added
    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::S3::Bucket", /^MyBucket.+/); // Resource has generated logical ID
  });

  it("should override the logicalId of a Construct when instructed", () => {
    const stack = simpleGuStackForTesting();
    new MigratableBucket(stack, "SomeBucket", {
      existingLogicalId: { logicalId: "FastlyLogs", reason: "Migrating a bucket from a YAML stack" },
    });

    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::S3::Bucket", "FastlyLogs");
  });

  it("should not override the logicalId of a Construct when not instructed", () => {
    const stack = simpleGuStackForTesting();
    new MigratableBucket(stack, "SomeBucket", {});

    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::S3::Bucket", /^SomeBucket.+/);
  });
});
