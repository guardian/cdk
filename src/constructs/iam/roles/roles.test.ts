import "../../../utils/test/jest";
import "@aws-cdk/assert/jest";
import { ServicePrincipal } from "@aws-cdk/aws-iam";
import { simpleGuStackForTesting } from "../../../utils/test";
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

  test("auto-generates the logicalId by default", () => {
    const stack = simpleGuStackForTesting();

    new GuRole(stack, "TestRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::IAM::Role", /^TestRole.+$/);
  });
});
