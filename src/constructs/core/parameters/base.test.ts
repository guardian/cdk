import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import type { SynthedStack } from "../../../utils/test";
import { simpleGuStackForTesting } from "../../../utils/test";
import { GuArnParameter, GuParameter, GuStringParameter } from "./base";

describe("The GuParameter class", () => {
  it("sets the type as passed through by default", () => {
    const stack = simpleGuStackForTesting();

    new GuParameter(stack, "Parameter", { type: "Boolean" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      Type: "Boolean",
    });
  });

  it("wraps the type with SSM utility is fromSSM is true", () => {
    const stack = simpleGuStackForTesting();

    new GuParameter(stack, "Parameter", { type: "Boolean", fromSSM: true });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      Type: "AWS::SSM::Parameter::Value<Boolean>",
    });
  });

  it("defaults to string if SSM is true but no type provided", () => {
    const stack = simpleGuStackForTesting();

    new GuParameter(stack, "Parameter", { fromSSM: true });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      Type: "AWS::SSM::Parameter::Value<String>",
    });
  });

  it("passes through other values without modification", () => {
    const stack = simpleGuStackForTesting();

    new GuParameter(stack, "Parameter", { type: "Boolean", fromSSM: true, description: "This is a test" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      Type: "AWS::SSM::Parameter::Value<Boolean>",
      Description: "This is a test",
    });
  });
});

describe("The GuStringParameter class", () => {
  it("should set the type to string", () => {
    const stack = simpleGuStackForTesting();

    new GuStringParameter(stack, "Parameter", { description: "This is a test" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      Type: "String",
      Description: "This is a test",
    });
  });
});

describe("The GuArnParameter class", () => {
  it("should constrain input to an ARN allowed pattern", () => {
    const stack = simpleGuStackForTesting();

    new GuArnParameter(stack, "Parameter", { description: "This is a test" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      Type: "String",
      Description: "This is a test",
      AllowedPattern: "arn:aws:[a-z0-9]*:[a-z0-9\\-]*:[0-9]{12}:.*",
      ConstraintDescription: "Must be a valid ARN, eg: arn:partition:service:region:account-id:resource-id",
    });
  });
});
