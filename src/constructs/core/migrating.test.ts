import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import type { BucketProps } from "@aws-cdk/aws-s3";
import { Bucket } from "@aws-cdk/aws-s3";
import type { SynthedStack } from "../../utils/test";
import { simpleGuStackForTesting } from "../../utils/test";
import type { GuStatefulConstruct } from "./migrating";
import { GuMigratingResource } from "./migrating";
import type { GuStack } from "./stack";

class TestGuStatefulConstruct extends Bucket implements GuStatefulConstruct {
  isStatefulConstruct: true;

  constructor(scope: GuStack, id: string, props?: BucketProps) {
    super(scope, id, props);
    this.isStatefulConstruct = true;
  }
}

/*
NOTE: In reality, we'd never directly call `GuMigratingResource.setLogicalId` as the GuConstruct will do that.
We're calling it here to test the function in isolation.
 */

describe("GuMigratingResource", () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- we are testing `console.info` being called, we don't need to see the message
  const info = jest.spyOn(console, "info").mockImplementation(() => {});

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- we are testing `console.warn` being called, we don't need to see the message
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

  afterEach(() => {
    warn.mockReset();
    info.mockReset();
  });

  test("Creating a new resource in a new stack produces a new auto-generated ID", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: false });
    const construct = new Bucket(stack, "MyBucket");

    GuMigratingResource.setLogicalId(construct, stack, {});

    expect(warn).toHaveBeenCalledTimes(0);
    expect(info).toHaveBeenCalledTimes(0);

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    const resourceKeys = Object.keys(json.Resources);

    expect(resourceKeys).toHaveLength(1);
    expect(resourceKeys[0]).toMatch(/^MyBucket[A-Z0-9]+$/);
  });

  test("Keeping a resource's logicalId when migrating a stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    const construct = new Bucket(stack, "MyBucket");

    GuMigratingResource.setLogicalId(construct, stack, { existingLogicalId: "my-pre-existing-bucket" });

    expect(warn).toHaveBeenCalledTimes(0);
    expect(info).toHaveBeenCalledTimes(0);

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("my-pre-existing-bucket");
  });

  test("Creating a construct in a migrating stack, w/out setting existingLogicalId", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    const construct = new Bucket(stack, "MyBucket");

    GuMigratingResource.setLogicalId(construct, stack, {});

    expect(info).toHaveBeenCalledTimes(0);
    expect(warn).toHaveBeenCalledTimes(0);

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    const resourceKeys = Object.keys(json.Resources);

    expect(resourceKeys).toHaveLength(1);
    expect(resourceKeys[0]).toMatch(/^MyBucket[A-Z0-9]+$/);
  });

  test("Specifying a construct's existingLogicalId in a new stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: false });
    const construct = new Bucket(stack, "MyBucket");

    GuMigratingResource.setLogicalId(construct, stack, { existingLogicalId: "my-pre-existing-bucket" });

    expect(info).toHaveBeenCalledTimes(0);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "GuStack has 'migratedFromCloudFormation' set to false. MyBucket has an 'existingLogicalId' set to my-pre-existing-bucket. This will have no effect - the logicalId will be auto-generated. Set 'migratedFromCloudFormation' to true for 'existingLogicalId' to be observed."
    );

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    const resourceKeys = Object.keys(json.Resources);

    expect(resourceKeys).toHaveLength(1);
    expect(resourceKeys[0]).toMatch(/^MyBucket[A-Z0-9]+$/);
  });

  test("Creating a stateful construct in a migrating stack, w/out setting existingLogicalId", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    const construct = new TestGuStatefulConstruct(stack, "MyBucket");

    GuMigratingResource.setLogicalId(construct, stack, {});
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "GuStack has 'migratedFromCloudFormation' set to true. MyBucket is a stateful construct and 'existingLogicalId' has not been set. MyBucket's logicalId will be auto-generated and consequently AWS will create a new resource rather than inheriting an existing one. This is not advised as downstream services, such as DNS, will likely need updating."
    );
  });

  test("Creating a stateful construct in a new stack, w/out setting existingLogicalId", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: false });
    const construct = new TestGuStatefulConstruct(stack, "MyBucket");

    GuMigratingResource.setLogicalId(construct, stack, {});
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith(
      "GuStack has 'migratedFromCloudFormation' set to false. MyBucket is a stateful construct, it's logicalId will be auto-generated and AWS will create a new resource."
    );
  });
});
