import { Template } from "aws-cdk-lib/assertions";
import { simpleTestingResources } from "../../../utils/test";
import { GuSubnetListParameter } from "./vpc";

describe("The GuSubnetListParameter class", () => {
  it("should combine override and prop values", () => {
    const { stack, app } = simpleTestingResources();

    new GuSubnetListParameter(app, "Parameter", { description: "This is a test" });

    Template.fromStack(stack).hasParameter("Parameter", {
      Type: "List<AWS::EC2::Subnet::Id>",
      Description: "This is a test",
    });
  });
});
