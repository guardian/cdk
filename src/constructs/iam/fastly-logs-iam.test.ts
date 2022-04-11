import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuFastlyLogsIamRole } from "./fastly-logs-iam";

describe("The GuFastlyLogsIamRole construct", () => {
  it("correctly wires up the policy", () => {
    const stack = simpleGuStackForTesting();
    new GuFastlyLogsIamRole(stack, {
      bucketName: "test",
      path: "TEST/stack/app/*",
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
