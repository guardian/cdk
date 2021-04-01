import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import type { SynthedStack } from "../../utils/test";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuKinesisStream } from "./kinesis-stream";

describe("The GuKinesisStream construct", () => {
  it("should not override the id by default", () => {
    const stack = simpleGuStackForTesting();
    new GuKinesisStream(stack, "my-kinesis-stream");
    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("my-kinesis-stream");
  });

  it("should override the id with the overrideId prop set to true", () => {
    const stack = simpleGuStackForTesting();
    new GuKinesisStream(stack, "my-kinesis-stream", { overrideId: true });
    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("my-kinesis-stream");
  });
});
