import { Template } from "aws-cdk-lib/assertions";
import { simpleTestingResources } from "../../utils/test";
import { GuFastlyLogsIamRole } from "./fastly-logs-iam";

describe("The GuFastlyLogsIamRole construct", () => {
  it("correctly wires up the policy", () => {
    const { stack, app } = simpleTestingResources();
    new GuFastlyLogsIamRole(app, {
      bucketName: "test",
      path: "TEST/stack/app/*",
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
