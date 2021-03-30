import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { simpleGuStackForTesting } from "../../../utils/test";
import { GuGetS3ObjectsPolicy } from "../policies";
import { GuInstanceRole } from "./instance-role";

describe("The GuInstanceRole construct", () => {
  it("should create the correct resources with minimal config", () => {
    const stack = simpleGuStackForTesting();
    new GuInstanceRole(stack, { withoutLogShipping: true, app: "testing" });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toCountResources("AWS::IAM::Role", 1);
    expect(stack).toCountResources("AWS::IAM::Policy", 4);
  });

  it("should create an additional logging policy if logging stream is specified", () => {
    const stack = simpleGuStackForTesting();
    new GuInstanceRole(stack, { app: "testing" });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toCountResources("AWS::IAM::Role", 1);
    expect(stack).toCountResources("AWS::IAM::Policy", 5);
  });

  it("should allow additional policies to be specified", () => {
    const stack = simpleGuStackForTesting();

    new GuInstanceRole(stack, {
      app: "testing",
      withoutLogShipping: true,
      additionalPolicies: [new GuGetS3ObjectsPolicy(stack, "GetConfigPolicy", { bucketName: "config" })],
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toCountResources("AWS::IAM::Role", 1);
    expect(stack).toCountResources("AWS::IAM::Policy", 5);
  });

  it("should be possible to create multiple instance roles in a single stack", () => {
    const stack = simpleGuStackForTesting();

    new GuInstanceRole(stack, {
      app: "my-first-app",
    });

    new GuInstanceRole(stack, {
      app: "my-second-app",
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toCountResources("AWS::IAM::Role", 2);
    expect(stack).toCountResources("AWS::IAM::Policy", 7); // 3 shared policies + 2 policies per role (3 + (2*2))
  });
});
