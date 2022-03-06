import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../../utils/test";
import { GuSubnetListParameter } from "./vpc";

describe("The GuSubnetListParameter class", () => {
  it("should combine override and prop values", () => {
    const stack = simpleGuStackForTesting();

    new GuSubnetListParameter(stack, "Parameter", { description: "This is a test" });

    Template.fromStack(stack).hasParameter("Parameter", {
      Type: "List<AWS::EC2::Subnet::Id>",
      Description: "This is a test",
    });
  });
});
