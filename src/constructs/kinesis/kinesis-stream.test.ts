import "@aws-cdk/assert/jest";
import "../../utils/test/jest";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuKinesisStream } from "./kinesis-stream";

describe("The GuKinesisStream construct", () => {
  test("auto-generates the logicalId by default", () => {
    const stack = simpleGuStackForTesting();
    new GuKinesisStream(stack, "LoggingStream");
    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::Kinesis::Stream", /^LoggingStream.+$/);
  });

  it("overrides the logicalId when existingLogicalId is set in a migrating stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuKinesisStream(stack, "LoggingStream", { existingLogicalId: { logicalId: "MyStream", reason: "testing" } });

    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::Kinesis::Stream", "MyStream");
  });
});
