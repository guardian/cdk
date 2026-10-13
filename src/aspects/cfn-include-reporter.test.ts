import { mock, suite, test } from "node:test";
import { join } from "path";
import { Annotations, App, Aspects, Stack } from "aws-cdk-lib";
import { CfnInclude } from "aws-cdk-lib/cloudformation-include";
import { LibraryInfo } from "../constants";
import { CfnIncludeReporter } from "./cfn-include-reporter";

suite("CfnIncludeReporter aspect", () => {
  test("prompts to check for stateful resources", (t) => {
    const addWarning = mock.method(Annotations.prototype, "addWarning");

    const app = new App();

    const stack = new Stack(app, "Test");
    new CfnInclude(stack, "Template", { templateFile: join(__dirname, "__data__", "cfn.yaml") });

    Aspects.of(stack).add(new CfnIncludeReporter());

    app.synth();

    t.assert.deepEqual(addWarning.mock.calls[0]?.arguments, [
      `As you're migrating a YAML/JSON template to ${LibraryInfo.NAME}, be sure to check for any stateful resources! See https://github.com/guardian/cdk/blob/main/docs/stateful-resources.md.`,
    ]);
  });

  test("does not prompt to check for stateful resources", (t) => {
    const addWarning = mock.method(Annotations.prototype, "addWarning");

    const app = new App();

    const stack = new Stack(app, "Test");
    Aspects.of(stack).add(new CfnIncludeReporter());

    app.synth();

    t.assert.deepEqual(addWarning.mock.calls.length, 0);
  });
});
