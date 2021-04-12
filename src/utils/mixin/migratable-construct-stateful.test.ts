import type { BucketProps } from "@aws-cdk/aws-s3";
import "../test/jest";
import { Bucket } from "@aws-cdk/aws-s3";
import type { GuStack } from "../../constructs/core";
import type { GuMigratingResource } from "../../constructs/core/migrating";
import { Logger } from "../logger";
import { simpleGuStackForTesting } from "../test";
import { GuStatefulMigratableConstruct } from "./migratable-construct-stateful";

interface TestGuMigratableConstructProps extends BucketProps, GuMigratingResource {}

class StatefulTestGuMigratableConstruct extends GuStatefulMigratableConstruct(Bucket) {
  constructor(scope: GuStack, id: string, props: TestGuMigratableConstructProps) {
    super(scope, id, props);
  }
}

describe("The GuStatefulMigratableConstruct mixin", () => {
  const info = jest.spyOn(Logger, "info");

  beforeEach(() => {
    info.mockReset();
  });

  it("should add the `isStatefulConstruct` property when used", () => {
    const stack = simpleGuStackForTesting();
    const bucket = new StatefulTestGuMigratableConstruct(stack, "MyBucket", {});

    expect(bucket.isStatefulConstruct).toBe(true);
  });

  it("should trigger a warning when creating a stateful construct in a new stack", () => {
    const stack = simpleGuStackForTesting();
    new StatefulTestGuMigratableConstruct(stack, "MyBucket", {});

    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith(
      "GuStack has 'migratedFromCloudFormation' set to false. MyBucket is a stateful construct, it's logicalId will be auto-generated and AWS will create a new resource."
    );
    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::S3::Bucket", /^MyBucket.+/);
  });
});
