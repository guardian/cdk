import "@aws-cdk/assert/jest";
import "../../utils/test/jest";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuKinesisStream } from "./kinesis-stream";

describe("The GuKinesisStream construct", () => {
  it("should not override the id by default", () => {
    const stack = simpleGuStackForTesting();
    new GuKinesisStream(stack, "my-kinesis-stream");

    expect(stack).not.toHaveResourceOfTypeAndLogicalId("AWS::Kinesis::Stream", "my-kinesis-stream");
  });

  it("overrides the logicalId when existingLogicalId is set in a migrating stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuKinesisStream(stack, "my-kinesis-stream", { existingLogicalId: "MyStream" });

    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::Kinesis::Stream", "MyStream");
  });
});
