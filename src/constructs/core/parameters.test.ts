import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import { Stack } from "@aws-cdk/core";
import { simpleGuStackForTesting } from "../../../test/utils/simple-gu-stack";
import type { SynthedStack } from "../../../test/utils/synthed-stack";
import { Stage, Stages } from "../../constants";
import {
  arnRegex,
  GuAmiParameter,
  GuArnParameter,
  GuInstanceTypeParameter,
  GuS3ObjectArnParameter,
  GuSSMParameter,
  GuStackParameter,
  GuStageParameter,
  GuStringParameter,
  GuSubnetListParameter,
  GuVpcParameter,
  s3ArnRegex,
} from "./parameters";
import type { GuStack } from "./stack";

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
    const stack = simpleGuStackForTesting();

    new GuSSMParameter(stack, "Parameter", { description: "This is a test" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      NoEcho: true,
      Type: "AWS::SSM::Parameter::Value<String>",
      Description: "This is a test",
    });
  });

  it("let's you override default props", () => {
    const stack = simpleGuStackForTesting();

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

  it("should successfully regex against valid ARNs", () => {
    const regex = new RegExp(arnRegex);
    expect(regex.test("fooooo")).toBeFalsy();
    expect(regex.test("arn:aws:rds:us-east-2:123456789012:db:my-mysql-instance-1")).toBeTruthy();
  });
});

describe("The GuS3ObjectArnParameter class", () => {
  it("should constrain input to a S3 ARN allowed pattern", () => {
    const stack = simpleGuStackForTesting();

    new GuS3ObjectArnParameter(stack, "Parameter", { description: "This is a test" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters.Parameter).toEqual({
      Type: "String",
      Description: "This is a test",
      AllowedPattern: "arn:aws:s3:::(?!^(\\d{1,3}\\.){3}\\d{1,3}$)(^[a-z0-9]([a-z0-9-]*(\\.[a-z0-9])?)*$(?<!\\-))*",
      ConstraintDescription:
        "Must be a valid S3 ARN, see https://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html",
    });
  });

  it("should successfully regex against valid s3 ARNs only", () => {
    const regex = new RegExp(s3ArnRegex);
    expect(regex.test("fooooo")).toBeFalsy();
    expect(regex.test("arn:aws:rds:us-east-2:123456789012:db:my-mysql-instance-1")).toBeFalsy();
    expect(regex.test("arn:aws:s3:::examplebucket/my-data/sales-export-2019-q4.json")).toBeTruthy();
  });
});
