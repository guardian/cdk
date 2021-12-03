import "@aws-cdk/assert/jest";

import { SynthUtils } from "@aws-cdk/assert";
import "../../utils/test/jest";
import { Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import { Annotations, App } from "@aws-cdk/core";
import { Stage, StageForInfrastructure, Stages } from "../../constants";
import { ContextKeys } from "../../constants/context-keys";
import { TagKeys } from "../../constants/tag-keys";
import { simpleGuStackForTesting } from "../../utils/test";
import type { SynthedStack } from "../../utils/test";
import { GuParameter } from "./parameters";
import { GuStack, GuStackForInfrastructure } from "./stack";

describe("The GuStack construct", () => {
  const warn = jest.spyOn(Annotations.prototype, "addWarning");

  afterEach(() => {
    warn.mockReset();
  });

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

  it("should apply the stack and stage tags to resources added to it", () => {
    const stack = new GuStack(new App(), "Test", { stack: "test" });

    new Role(stack, "MyRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    expect(stack).toHaveGuTaggedResource("AWS::IAM::Role");
  });

  it("should not apply any tags when withoutTags is set to true", () => {
    const stack = new GuStack(new App(), "Test", { stack: "test", withoutTags: true });

    new Role(stack, "MyRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    expect(stack).not.toHaveGuTaggedResource("AWS::IAM::Role");
  });

  it("should prefer context values for repository information", () => {
    const stack = new GuStack(new App({ context: { [ContextKeys.REPOSITORY_URL]: "my-repository" } }), "Test", {
      stack: "test",
    });

    new Role(stack, "MyRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    expect(stack).toHaveGuTaggedResource("AWS::IAM::Role", {
      additionalTags: [
        {
          Key: TagKeys.REPOSITORY_NAME,
          Value: "my-repository",
        },
      ],
    });
  });

  it("should return a parameter that exists", () => {
    const stack = new GuStack(new App(), "Test", { stack: "test" });
    const testParam = new GuParameter(stack, "MyTestParam", {});
    stack.setParam(testParam);

    const actual = stack.getParam<GuParameter>("MyTestParam");
    expect(actual).toBe(testParam);
  });

  it("should throw on attempt to get a parameter that doesn't exist", () => {
    const stack = new GuStack(new App(), "Test", { stack: "test" });

    expect(() => stack.getParam<GuParameter>("i-do-not-exist")).toThrowError(
      "Attempting to read parameter i-do-not-exist which does not exist"
    );
  });

  it("should warn when calling withStageDependentValue with the INFRA stage", () => {
    const stack = new GuStack(new App(), "Test", { stack: "test" });

    stack.withStageDependentValue({
      app: "test",
      variableName: "test",
      stageValues: {
        [StageForInfrastructure]: 1,
      },
    });
    expect(warn).toHaveBeenCalledWith(
      "GuStack does not have a stage of INFRA. Setting a mapping value for it has no impact."
    );
  });
});

describe("The GuStackForInfrastructure construct", () => {
  it("should have a stage of INFRA", () => {
    const stack = new GuStackForInfrastructure(new App(), "Test", { stack: "test" });
    expect(stack.stage).toBe("INFRA");
  });

  it("should throw when calling withStageDependentValue with a non-INFRA stage", () => {
    const stack = new GuStackForInfrastructure(new App(), "Test", { stack: "test" });

    expect(() => {
      stack.withStageDependentValue({
        app: "test",
        variableName: "test",
        stageValues: {
          [Stage.CODE]: 1,
          [Stage.PROD]: 2,
        },
      });
    }).toThrowError("Mapping doesn't contain top-level key 'INFRA'");
  });
});
