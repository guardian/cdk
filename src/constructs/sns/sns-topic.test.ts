import "@aws-cdk/assert/jest";
import "../../utils/test/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuSnsTopic } from "./sns-topic";

describe("The GuSnsTopic construct", () => {
  it("should not override the id by default", () => {
    const stack = simpleGuStackForTesting();
    new GuSnsTopic(stack, "MySnsTopic");
    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::SNS::Topic", /MySnsTopic.+/);
  });

  it("overrides the logicalId when existingLogicalId is set in a migrating stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuSnsTopic(stack, "my-sns-topic", { existingLogicalId: { logicalId: "TheSnsTopic", reason: "testing" } });
    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::SNS::Topic", "TheSnsTopic");
  });

  it("can be configured to grant publish access to external accounts", () => {
    const stack = simpleGuStackForTesting();
    new GuSnsTopic(stack, "MySnsTopic", { accountsAllowedToPublish: ["012345678900"] });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should validate account ids", () => {
    const stack = simpleGuStackForTesting();

    expect(() => new GuSnsTopic(stack, "MySnsTopic", { accountsAllowedToPublish: ["abd"] })).toThrowError(
      new Error("abd is not an account ID - should match ^[0-9]{12}$")
    );
  });

  it("can be configured to grant publish access to organisations", () => {
    const stack = simpleGuStackForTesting();
    new GuSnsTopic(stack, "MySnsTopic", { organisationsAllowedToPublish: ["o-abcde12345"] });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should validate organisation ids", () => {
    const stack = simpleGuStackForTesting();

    expect(() => new GuSnsTopic(stack, "MySnsTopic", { organisationsAllowedToPublish: ["abd"] })).toThrowError(
      new Error("abd is not an organisation ID - should match ^o-[a-z0-9]{10,32}$")
    );
  });
});
