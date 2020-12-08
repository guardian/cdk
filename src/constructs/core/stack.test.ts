import "@aws-cdk/assert/jest";

import { SynthUtils } from "@aws-cdk/assert";
import { Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import { App } from "@aws-cdk/core";
import type { SynthedStack } from "../../../test/utils/synthed-stack";
import { Stage, Stages } from "../../constants";
import { GuStack } from "./stack";

describe("The GuStack construct", () => {
  it("should have stack and stage parameters", () => {
    const app = new App();
    const stack = new GuStack(app);

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters).toEqual({
      Stack: {
        Type: "String",
        Description: "Name of this stack",
        Default: "deploy",
      },
      Stage: {
        Type: "String",
        Description: "Stage name",
        AllowedValues: Stages,
        Default: Stage.CODE,
      },
    });
  });

  it("should apply the stack and stage tags to resources added to it", () => {
    const stack = new GuStack(new App());

    new Role(stack, "MyRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    expect(stack).toHaveResource("AWS::IAM::Role", {
      Tags: [
        {
          Key: "Stack",
          Value: {
            Ref: "Stack",
          },
        },
        {
          Key: "Stage",
          Value: {
            Ref: "Stage",
          },
        },
      ],
    });
  });
});
