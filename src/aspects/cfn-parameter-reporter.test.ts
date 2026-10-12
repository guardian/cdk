import { mock, suite, test } from "node:test";
import { Annotations, App, Aspects } from "aws-cdk-lib";
import { GuStack, GuStringParameter } from "../constructs/core";
import { CfnParameterReporter } from "./cfn-parameter-reporter";

suite("CfnParameterReporter aspect", () => {
  test.skip("should prompt to confirm SSM Parameter exists", (t) => {
    const addInfo = mock.method(Annotations.prototype, "addInfo");

    const app = new App();

    const stack = new GuStack(app, "Test", { stack: "test", stage: "TEST" });
    new GuStringParameter(stack, "DatabasePassword", { fromSSM: true, default: "/TEST/test/my-app/database-password" });
    Aspects.of(stack).add(new CfnParameterReporter());

    app.synth();

    t.assert.deepEqual(addInfo.mock.calls[0]?.arguments, [
      "Stack reads the SSM Parameter '/TEST/test/my-app/database-password'. Ensure it exists prior to deployment.",
    ]);
  });
});
