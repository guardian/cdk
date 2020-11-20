import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Stack } from "@aws-cdk/core";
import { GuGetS3ObjectPolicy } from "../constructs/iam";
import { InstanceRole } from "./instance-role";

describe("The InstanceRole construct", () => {
  it("should create the correct resources with minimal config", () => {
    const stack = new Stack();
    new InstanceRole(stack, { artifactBucket: "test" });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toCountResources("AWS::IAM::Role", 1);
    expect(stack).toCountResources("AWS::IAM::Policy", 2);
  });

  it("should create an additional logging policy if logging stream is specified", () => {
    const stack = new Stack();
    new InstanceRole(stack, { artifactBucket: "test", loggingStreamName: "my-logging-stream" });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toCountResources("AWS::IAM::Role", 1);
    expect(stack).toCountResources("AWS::IAM::Policy", 3);
  });

  it("should allow additional policies to be specified", () => {
    const stack = new Stack();

    new InstanceRole(stack, {
      artifactBucket: "test",
      additionalPolicies: [new GuGetS3ObjectPolicy(stack, "GetConfigPolicy", { bucket: "config" })],
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toCountResources("AWS::IAM::Role", 1);
    expect(stack).toCountResources("AWS::IAM::Policy", 3);
  });
});
