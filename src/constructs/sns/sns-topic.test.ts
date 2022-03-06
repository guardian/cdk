import { GuTemplate, simpleGuStackForTesting } from "../../utils/test";
import { GuSnsTopic } from "./sns-topic";

describe("The GuSnsTopic construct", () => {
  it("should not override the id by default", () => {
    const stack = simpleGuStackForTesting();
    new GuSnsTopic(stack, "MySnsTopic");
    new GuTemplate(stack).hasResourceWithLogicalId("AWS::SNS::Topic", /MySnsTopic.+/);
  });

  it("overrides the logicalId when existingLogicalId is set in a migrating stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuSnsTopic(stack, "my-sns-topic", { existingLogicalId: { logicalId: "TheSnsTopic", reason: "testing" } });
    new GuTemplate(stack).hasResourceWithLogicalId("AWS::SNS::Topic", "TheSnsTopic");
  });
});
