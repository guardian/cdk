import "@aws-cdk/assert/jest";

import { SynthUtils } from "@aws-cdk/assert";
import { Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import { App } from "@aws-cdk/core";
import { alphabeticalTags, simpleGuStackForTesting } from "../../../test/utils";
import type { SynthedStack } from "../../../test/utils";
import { Stage, Stages } from "../../constants";
import { TrackingTag } from "../../constants/library-info";
import { GuStack } from "./stack";

describe("The GuStack construct", () => {
  it("requires passing the stack value as props", function () {
    const stack = simpleGuStackForTesting({ stack: "some-stack" });
    expect(stack.stack).toEqual("some-stack");
  });

  it("should have a stage parameter", () => {
    const stack = simpleGuStackForTesting({ stack: "test" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters).toEqual({
      Stage: {
        Type: "String",
        Description: "Stage name",
        AllowedValues: Stages,
        Default: Stage.CODE,
      },
    });
  });

  it("should apply the stack, stage and app tags to resources added to it", () => {
    const stack = new GuStack(new App(), "Test", { app: "MyApp", stack: "test" });

    new Role(stack, "MyRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    expect(stack).toHaveResource("AWS::IAM::Role", {
      Tags: alphabeticalTags([
        {
          Key: "App",
          Value: "MyApp",
        },
        {
          Key: "Stack",
          Value: "test",
        },
        {
          Key: "Stage",
          Value: {
            Ref: "Stage",
          },
        },
        TrackingTag,
      ]),
    });
  });

  it("should return the correct app value when app is set", () => {
    const stack = new GuStack(new App(), "Test", { app: "MyApp", stack: "test" });

    expect(stack.app).toBe("MyApp");
  });
});
