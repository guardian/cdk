import { suite, test } from "node:test";
import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuFastlyLogsIamRole } from "./fastly-logs-iam";

suite("The GuFastlyLogsIamRole construct", () => {
  test("correctly wires up the policy", (t) => {
    const stack = simpleGuStackForTesting();
    new GuFastlyLogsIamRole(stack, {
      bucketName: "test",
      path: "TEST/stack/app/*",
    });
    t.assert.snapshot(Template.fromStack(stack).toJSON());
  });
});
