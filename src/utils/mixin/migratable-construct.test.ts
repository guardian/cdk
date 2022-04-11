import type { BucketProps } from "aws-cdk-lib/aws-s3";
import { Bucket } from "aws-cdk-lib/aws-s3";
import type { GuStack } from "../../constructs/core";
import { GuMigratingResource } from "../../constructs/core";
import { GuTemplate, simpleGuStackForTesting } from "../test";
import { GuMigratableConstruct } from "./migratable-construct";

interface TestGuMigratableConstructProps extends BucketProps, GuMigratingResource {}

class TestGuMigratableConstruct extends GuMigratableConstruct(Bucket) {
  constructor(scope: GuStack, id: string, props: TestGuMigratableConstructProps) {
    super(scope, id, props);
  }
}

describe("The GuMigratableConstruct mixin", () => {
  const spy = jest.spyOn(GuMigratingResource, "setLogicalId");

  afterEach(() => {
    spy.mockReset();
  });

  it("should call GuMigratingResource.setLogicalId when the stack is being migrated and existingLogicalId is set", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new TestGuMigratableConstruct(stack, "MyBucket", { existingLogicalId: { logicalId: "Hello", reason: "testing" } });

    expect(spy).toHaveBeenCalledTimes(1);
    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::S3::Bucket", "Hello");
  });

  it("should call GuMigratingResource.setLogicalId when the stack is not being migrated and existingLogicalId is set", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: false });
    new TestGuMigratableConstruct(stack, "MyBucket", { existingLogicalId: { logicalId: "Hello", reason: "testing" } });

    expect(spy).toHaveBeenCalledTimes(1);
    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::S3::Bucket", /^MyBucket.+/);
  });

  it("should call GuMigratingResource.setLogicalId even when existingLogicalId is undefined", () => {
    const stack = simpleGuStackForTesting();
    new TestGuMigratableConstruct(stack, "MyBucket", {});

    expect(spy).toHaveBeenCalledTimes(1);
    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::S3::Bucket", /^MyBucket.+/);
  });
});
