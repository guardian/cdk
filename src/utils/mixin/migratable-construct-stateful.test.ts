import { Annotations } from "aws-cdk-lib";
import type { BucketProps } from "aws-cdk-lib/aws-s3";
import { Bucket } from "aws-cdk-lib/aws-s3";
import type { GuMigratingResource, GuStack } from "../../constructs/core";
import { GuTemplate, simpleGuStackForTesting } from "../test";
import { GuStatefulMigratableConstruct } from "./migratable-construct-stateful";

interface TestGuMigratableConstructProps extends BucketProps, GuMigratingResource {}

class StatefulTestGuMigratableConstruct extends GuStatefulMigratableConstruct(Bucket) {
  constructor(scope: GuStack, id: string, props: TestGuMigratableConstructProps) {
    super(scope, id, props);
  }
}

describe("The GuStatefulMigratableConstruct mixin", () => {
  const info = jest.spyOn(Annotations.prototype, "addInfo");

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
    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::S3::Bucket", /^MyBucket.+/);
  });
});
