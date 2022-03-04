import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { App } from "@aws-cdk/core";
import { IntegrationTestStack } from "./integration-test-stack";

describe("The Cdk stack", () => {
  it("matches the snapshot", () => {
    const app = new App();
    const stack = new IntegrationTestStack(app, "cdk", { stack: "integration-test", stage: "PROD" });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});
