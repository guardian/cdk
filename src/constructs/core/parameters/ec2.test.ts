import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import { simpleGuStackForTesting } from "../../../utils/test";
import type { SynthedStack } from "../../../utils/test";
import { GuInstanceTypeParameter } from "./ec2";

describe("The GuInstanceTypeParameter class", () => {
  it("should combine default, override and prop values", () => {
    const stack = simpleGuStackForTesting();

    new GuInstanceTypeParameter(stack, { allowedValues: ["t3.small"], app: "testing" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters[`InstanceTypeTesting`]).toEqual({
      Type: "String",
      Description: "EC2 Instance Type for the app testing",
      Default: "t3.small",
      AllowedValues: ["t3.small"],
    });
  });

  it("let's you override the default values", () => {
    const stack = simpleGuStackForTesting();

    new GuInstanceTypeParameter(stack, {
      description: "This is a test",
      default: 1,
      app: "testing",
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters["InstanceTypeTesting"]).toEqual({
      Type: "String",
      Description: "This is a test",
      Default: 1,
    });
  });
});
