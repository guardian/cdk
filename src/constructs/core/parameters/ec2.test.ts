import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import type { SynthedStack } from "../../../../test/utils";
import { simpleGuStackForTesting } from "../../../../test/utils";
import { GuAmiParameter, GuInstanceTypeParameter } from "./ec2";

describe("The GuInstanceTypeParameter class", () => {
  it("should combine default, override and prop values", () => {
    const stack = simpleGuStackForTesting();

    new GuInstanceTypeParameter(stack, "Parameter", { allowedValues: ["t3.small"] });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      Type: "String",
      Description: "EC2 Instance Type",
      Default: "t3.small",
      AllowedValues: ["t3.small"],
    });
  });

  it("let's you override the default values", () => {
    const stack = simpleGuStackForTesting();

    new GuInstanceTypeParameter(stack, "Parameter", {
      description: "This is a test",
      default: 1,
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      Type: "String",
      Description: "This is a test",
      Default: 1,
    });
  });
});

describe("The GuAmiParameter class", () => {
  it("should combine override and prop values", () => {
    const stack = simpleGuStackForTesting();

    new GuAmiParameter(stack, "Parameter", { description: "This is a test" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      Type: "AWS::EC2::Image::Id",
      Description: "This is a test",
    });
  });
});
