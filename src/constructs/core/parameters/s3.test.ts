import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { GuStack } from "../stack";
import { GuDistributionBucketParameter } from "./s3";

describe("GuDistributionBucketParameter", () => {
  it("can exist in multiple GuStacks within the same App", () => {
    const app = new App();

    const stack1 = new GuStack(app, "MyAppCODE", { stack: "MyAppCODE", stage: "CODE" });
    const stack1Param = GuDistributionBucketParameter.getInstance(stack1);

    const stack2 = new GuStack(app, "MyAppPROD", { stack: "MyAppPROD", stage: "PROD" });
    const stack2Param = GuDistributionBucketParameter.getInstance(stack2);

    expect(stack1Param).not.toEqual(stack2Param);

    // make doubly sure the two stacks can be synthesised
    Template.fromStack(stack1).toJSON();
    Template.fromStack(stack2).toJSON();
  });
});
