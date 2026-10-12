import { suite, test } from "node:test";
import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { GuStack } from "../stack";
import { GuDistributionBucketParameter } from "./s3";

suite("GuDistributionBucketParameter", () => {
  test("can exist in multiple GuStacks within the same App", (t) => {
    const app = new App();

    const stack1 = new GuStack(app, "MyAppCODE", { stack: "MyAppCODE", stage: "CODE" });
    const stack1Param = GuDistributionBucketParameter.getInstance(stack1);

    const stack2 = new GuStack(app, "MyAppPROD", { stack: "MyAppPROD", stage: "PROD" });
    const stack2Param = GuDistributionBucketParameter.getInstance(stack2);

    t.assert.notDeepStrictEqual(stack1Param, stack2Param);

    // make doubly sure the two stacks can be synthesised
    Template.fromStack(stack1).toJSON();
    Template.fromStack(stack2).toJSON();
  });
});
