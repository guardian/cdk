import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuFastlyLogsIam } from "./fastly-logs-iam";

describe("The GuFastlyLogsIam pattern", () => {
  it("correctly wires up the policy", () => {
    const stack = simpleGuStackForTesting();
    new GuFastlyLogsIam(stack, "FastlyS3LoggingIam", {
      bucketName: "test",
      path: "/TEST/stack/app/*",
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});
