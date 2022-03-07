import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { IntegrationTestStack } from "./integration-test-stack";

describe("The Cdk stack", () => {
  it("matches the snapshot", () => {
    const app = new App();
    const stack = new IntegrationTestStack(app, "cdk", { stack: "integration-test", stage: "PROD" });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
