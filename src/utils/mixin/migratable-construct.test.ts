import type { BucketProps } from "@aws-cdk/aws-s3";
import "../test/jest";
import { Bucket } from "@aws-cdk/aws-s3";
import type { GuStack } from "../../constructs/core";
import { GuMigratingResource } from "../../constructs/core/migrating";
import { simpleGuStackForTesting } from "../test";
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
    new TestGuMigratableConstruct(stack, "MyBucket", { existingLogicalId: "Hello" });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::S3::Bucket", "Hello");
  });

  it("should call GuMigratingResource.setLogicalId when the stack is not being migrated and existingLogicalId is set", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: false });
    new TestGuMigratableConstruct(stack, "MyBucket", { existingLogicalId: "Hello" });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::S3::Bucket", /^MyBucket.+/);
  });

  it("should call GuMigratingResource.setLogicalId even when existingLogicalId is undefined", () => {
    const stack = simpleGuStackForTesting();
    new TestGuMigratableConstruct(stack, "MyBucket", {});

    expect(spy).toHaveBeenCalledTimes(1);
    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::S3::Bucket", /^MyBucket.+/);
  });
});
