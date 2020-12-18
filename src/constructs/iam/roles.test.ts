import { SynthUtils } from "@aws-cdk/assert";
import "@aws-cdk/assert/jest";
import { ServicePrincipal } from "@aws-cdk/aws-iam";
import { simpleGuStackForTesting } from "../../../test/utils/simple-gu-stack";
import type { SynthedStack } from "../../../test/utils/synthed-stack";
import { GuRole } from "./roles";

describe("The GuRole class", () => {
  it("overrides id if prop set to true", () => {
    const stack = simpleGuStackForTesting();

    new GuRole(stack, "TestRole", {
      overrideId: true,
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("TestRole");
  });

  it("does not override id if prop set to false", () => {
    const stack = simpleGuStackForTesting();

    new GuRole(stack, "TestRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("TestRole");
  });

  it("returns a string value for the child ref", () => {
    const stack = simpleGuStackForTesting();

    const role = new GuRole(stack, "TestRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    expect(typeof role.ref).toBe("string");
  });
});
