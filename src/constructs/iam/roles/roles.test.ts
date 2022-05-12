import { ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { GuTemplate, simpleGuStackForTesting } from "../../../utils/test";
import { GuRole } from "./roles";

describe("The GuRole class", () => {
  it("overrides the logicalId when existingLogicalId is set", () => {
    const stack = simpleGuStackForTesting();

    new GuRole(stack, "TestRole", {
      existingLogicalId: { logicalId: "MyRole", reason: "testing" },
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::IAM::Role", "MyRole");
  });

  test("auto-generates the logicalId by default", () => {
    const stack = simpleGuStackForTesting();

    new GuRole(stack, "TestRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::IAM::Role", /^TestRole.+$/);
  });
});
