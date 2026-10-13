import { suite, test } from "node:test";
import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuVpc } from "./vpc";

suite("The GuVpc construct", () => {
  test("should match snapshot", (t) => {
    const stack = simpleGuStackForTesting({
      stack: "test-stack",
      env: { region: "eu-west-1", account: "000000000000" },
    });
    new GuVpc(stack, "MyVpc");
    t.assert.snapshot(Template.fromStack(stack).toJSON());
  });

  test("should be possible to create two vpcs in the same stack", () => {
    const stack = simpleGuStackForTesting({
      stack: "test-stack",
      env: { region: "eu-west-1", account: "000000000000" },
    });
    new GuVpc(stack, "MyVpc");
    new GuVpc(stack, "MyOtherVpc");
  });
});
