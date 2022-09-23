import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuVpc } from "./vpc";

describe("The GuVpc construct", () => {
  it("should match snapshot", () => {
    const stack = simpleGuStackForTesting({
      stack: "test-stack",
      env: { region: "eu-west-1", account: "000000000000" },
    });
    new GuVpc(stack, "MyVpc");
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
