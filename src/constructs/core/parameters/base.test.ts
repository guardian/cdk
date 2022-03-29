import "@aws-cdk/assert/jest";
import { SynthUtils } from "aws-cdk-lib/assert/lib/synth-utils";
import { simpleGuStackForTesting } from "../../../utils/test";
import type { SynthedStack } from "../../../utils/test";
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
      Default: "/$STAGE/$STACK/$APP/parameter",
      Type: "AWS::SSM::Parameter::Value<Boolean>",
    });
  });

  it("defaults to string if SSM is true but no type provided", () => {
    const stack = simpleGuStackForTesting();

    new GuParameter(stack, "Parameter", { fromSSM: true });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      Default: "/$STAGE/$STACK/$APP/parameter",
      Type: "AWS::SSM::Parameter::Value<String>",
    });
  });

  it("passes through other values without modification", () => {
    const stack = simpleGuStackForTesting();

    new GuParameter(stack, "Parameter", { type: "Boolean", fromSSM: true, description: "This is a test" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      Default: "/$STAGE/$STACK/$APP/parameter",
      Type: "AWS::SSM::Parameter::Value<Boolean>",
      Description: "This is a test",
    });
  });

  it("when from SSM, has a default SSM path to remind users that it's an SSM parameter", () => {
    const stack = simpleGuStackForTesting();

    new GuParameter(stack, "Parameter", { fromSSM: true });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toHaveProperty("Default");
    expect(json.Parameters.Parameter.Default).toEqual("/$STAGE/$STACK/$APP/parameter");
  });

  it("default SSM path gets overridden by prop", () => {
    const stack = simpleGuStackForTesting();

    new GuParameter(stack, "Parameter", { fromSSM: true, default: "/FOO/BAR" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter.Default).toEqual("/FOO/BAR");
  });

  it("when not from SSM, has no default", () => {
    const stack = simpleGuStackForTesting();

    new GuParameter(stack, "Parameter", { fromSSM: false });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).not.toHaveProperty("Default");
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
