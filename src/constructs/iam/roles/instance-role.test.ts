import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { simpleGuStackForTesting } from "../../../../test/utils";
import { GuGetS3ObjectsPolicy } from "../policies";
import { GuInstanceRole } from "./instance-role";

describe("The GuInstanceRole construct", () => {
  it("should create the correct resources with minimal config", () => {
    const stack = simpleGuStackForTesting();
    new GuInstanceRole(stack, "GuInstanceRole", { withoutLogShipping: true });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toCountResources("AWS::IAM::Role", 1);
    expect(stack).toCountResources("AWS::IAM::Policy", 4);
  });

  it("should create an additional logging policy if logging stream is specified", () => {
    const stack = simpleGuStackForTesting();
    new GuInstanceRole(stack);

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toCountResources("AWS::IAM::Role", 1);
    expect(stack).toCountResources("AWS::IAM::Policy", 5);
  });

  it("should allow additional policies to be specified", () => {
    const stack = simpleGuStackForTesting();

    new GuInstanceRole(stack, "GuInstanceRole", {
      withoutLogShipping: true,
      additionalPolicies: [new GuGetS3ObjectsPolicy(stack, "GetConfigPolicy", { bucketName: "config" })],
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toCountResources("AWS::IAM::Role", 1);
    expect(stack).toCountResources("AWS::IAM::Policy", 5);
  });
});
