import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import { simpleGuStackForTesting } from "../../../utils/test";
import { GuSubnetListParameter, GuVpcParameter } from "./vpc";
import type { SynthedStack } from "../../../utils/test";

describe("The GuSubnetListParameter class", () => {
  it("should combine override and prop values", () => {
    const stack = simpleGuStackForTesting();

    new GuSubnetListParameter(stack, "Parameter", { description: "This is a test" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      Type: "List<AWS::EC2::Subnet::Id>",
      Description: "This is a test",
    });
  });
});

describe("The GuVpcParameter class", () => {
  it("should combine override and prop values", () => {
    const stack = simpleGuStackForTesting();

    new GuVpcParameter(stack, "Parameter", { description: "This is a test" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      Type: "AWS::EC2::VPC::Id",
      Description: "This is a test",
    });
  });
});
