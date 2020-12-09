import { SynthUtils } from "@aws-cdk/assert";
import "@aws-cdk/assert/jest";
import { ServicePrincipal } from "@aws-cdk/aws-iam";
import { App } from "@aws-cdk/core";
import type { SynthedStack } from "../../../test/utils/synthed-stack";
import { GuStack } from "../core";
import { GuRole } from "./roles";

describe("The GuRole class", () => {
  it("overrides id if prop set to true", () => {
    const stack = new GuStack(new App());

    new GuRole(stack, "TestRole", {
      overrideId: true,
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("TestRole");
  });

  it("does not override id if prop set to false", () => {
    const stack = new GuStack(new App());

    new GuRole(stack, "TestRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("TestRole");
  });

  it("returns a string value for the child ref", () => {
    const stack = new GuStack(new App());

    const role = new GuRole(stack, "TestRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    expect(typeof role.ref).toBe("string");
  });
});
