import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import { simpleGuStackForTesting } from "../../../../test/utils";
import type { SynthedStack } from "../../../../test/utils";
import {
  GuAmiParameter,
  GuArnParameter,
  GuInstanceTypeParameter,
  GuParameter,
  GuStringParameter,
  GuSubnetListParameter,
  GuVpcParameter,
} from "./";

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
});

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
