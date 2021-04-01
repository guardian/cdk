import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import type { SynthedStack } from "../../utils/test";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuSnsTopic } from "./sns-topic";

describe("The GuSnsTopic construct", () => {
  it("should not override the id by default", () => {
    const stack = simpleGuStackForTesting();
    new GuSnsTopic(stack, "my-sns-topic");
    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("my-sns-topic");
  });

  it("should override the id with the overrideId prop set to true", () => {
    const stack = simpleGuStackForTesting();
    new GuSnsTopic(stack, "my-sns-topic", { overrideId: true });
    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("my-sns-topic");
  });
});
