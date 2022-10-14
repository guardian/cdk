import { Annotations, App, Aspects } from "aws-cdk-lib";
import { GuStack, GuStringParameter } from "../constructs/core";
import { CfnParameterReporter } from "./cfn-parameter-reporter";

describe("CfnParameterReporter aspect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should prompt to confirm SSM Parameter exists", () => {
    const info = jest.spyOn(Annotations.prototype, "addInfo");

    const app = new App();

    const stack = new GuStack(app, "Test", { stack: "test", stage: "TEST" });
    new GuStringParameter(stack, "DatabasePassword", { fromSSM: true, default: "/TEST/test/my-app/database-password" });
    Aspects.of(stack).add(new CfnParameterReporter());

    app.synth();

    expect(info).toHaveBeenCalledWith(
      "Stack reads the SSM Parameter '/TEST/test/my-app/database-password'. Ensure it exists prior to deployment."
    );
  });
});
