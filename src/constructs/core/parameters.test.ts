import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import { App, Stack } from "@aws-cdk/core";
import { Stage, Stages } from "../../constants";
import {
  GuAmiParameter,
  GuInstanceTypeParameter,
  GuSSMParameter,
  GuStackParameter,
  GuStageParameter,
  GuStringParameter,
  GuSubnetListParameter,
  GuVpcParameter,
} from "./parameters";
import { GuStack } from "./stack";

interface SynthedStack {
  Parameters: Record<string, { Properties: Record<string, unknown> }>;
}

describe("The GuStringParameter class", () => {
  it("should set the type to string", () => {
    const app = new App();
    const stack = new GuStack(app);

    new GuStringParameter(stack, "Parameter", { description: "This is a test" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      Type: "String",
      Description: "This is a test",
    });
  });
});

describe("The GuStageParameter class", () => {
  it("should set the values as required", () => {
    const stack = new Stack() as GuStack;

    new GuStageParameter(stack);

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Stage).toEqual({
      Type: "String",
      Description: "Stage name",
      AllowedValues: Stages,
      Default: Stage.CODE,
    });
  });
});

describe("The GuStackParameter class", () => {
  it("should set the values as required", () => {
    const stack = new Stack() as GuStack;

    new GuStackParameter(stack);

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Stack).toEqual({
      Type: "String",
      Description: "Name of this stack",
      Default: "deploy",
    });
  });
});

describe("The GuInstanceTypeParameter class", () => {
  it("should combine default, override and prop values", () => {
    const app = new App();
    const stack = new GuStack(app);

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
    const app = new App();
    const stack = new GuStack(app);

    new GuInstanceTypeParameter(stack, "Parameter", {
      type: "Number",
      description: "This is a test",
      default: 1,
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      Type: "Number",
      Description: "This is a test",
      Default: 1,
    });
  });
});

describe("The GuSSMParameter class", () => {
  it("should combine default, override and prop values", () => {
    const app = new App();
    const stack = new GuStack(app);

    new GuSSMParameter(stack, "Parameter", { description: "This is a test" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      NoEcho: true,
      Type: "AWS::SSM::Parameter::Value<String>",
      Description: "This is a test",
    });
  });

  it("let's you override default props", () => {
    const app = new App();
    const stack = new GuStack(app);

    new GuSSMParameter(stack, "Parameter", { noEcho: false, description: "This is a test" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      NoEcho: false,
      Type: "AWS::SSM::Parameter::Value<String>",
      Description: "This is a test",
    });
  });
});

describe("The GuSubnetListParameter class", () => {
  it("should combine override and prop values", () => {
    const app = new App();
    const stack = new GuStack(app);

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
    const app = new App();
    const stack = new GuStack(app);

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
    const app = new App();
    const stack = new GuStack(app);

    new GuAmiParameter(stack, "Parameter", { description: "This is a test" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      Type: "AWS::EC2::Image::Id",
      Description: "This is a test",
    });
  });
});
