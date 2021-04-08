import "@aws-cdk/assert/jest";
import "../../../utils/test/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { ServicePrincipal } from "@aws-cdk/aws-iam";
import { simpleGuStackForTesting } from "../../../utils/test";
import type { SynthedStack } from "../../../utils/test";
import { GuRole } from "./roles";

describe("The GuRole class", () => {
  it("overrides the logicalId when existingLogicalId is set in a migrating stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });

    new GuRole(stack, "TestRole", {
      existingLogicalId: "MyRole",
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::IAM::Role", "MyRole");
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
