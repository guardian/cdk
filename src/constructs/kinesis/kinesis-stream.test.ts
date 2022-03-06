import { GuTemplate, simpleGuStackForTesting } from "../../utils/test";
import { GuKinesisStream } from "./kinesis-stream";

describe("The GuKinesisStream construct", () => {
  test("auto-generates the logicalId by default", () => {
    const stack = simpleGuStackForTesting();
    new GuKinesisStream(stack, "LoggingStream");
    new GuTemplate(stack).hasResourceWithLogicalId("AWS::Kinesis::Stream", /^LoggingStream.+$/);
  });

  it("overrides the logicalId when existingLogicalId is set in a migrating stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuKinesisStream(stack, "LoggingStream", { existingLogicalId: { logicalId: "MyStream", reason: "testing" } });
    new GuTemplate(stack).hasResourceWithLogicalId("AWS::Kinesis::Stream", "MyStream");
  });
});
