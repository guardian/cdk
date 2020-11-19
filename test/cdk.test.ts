import { countResources, expect as expectCDK } from "@aws-cdk/assert";
import { App, Stack } from "@aws-cdk/core";
import { Cdk as Cdk_Cdk } from "../src/index";

/*
 * Example test
 */
test("SNS Topic Created", () => {
  const app = new App();
  const stack = new Stack(app, "TestStack");
  // WHEN
  new Cdk_Cdk(stack, "MyTestConstruct");
  // THEN
  expectCDK(stack).to(countResources("AWS::SNS::Topic", 0));
});
