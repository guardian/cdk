import "@aws-cdk/assert/jest";

import { SynthUtils } from "@aws-cdk/assert";
import { Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import { Bucket } from "@aws-cdk/aws-s3";
import { App } from "@aws-cdk/core";
import { Stage, Stages } from "../../constants";
import { TrackingTag } from "../../constants/tracking-tag";
import { Logger } from "../../utils/logger";
import { alphabeticalTags, simpleGuStackForTesting } from "../../utils/test";
import type { SynthedStack } from "../../utils/test";
import { GuParameter } from "./parameters";
import { GuStack } from "./stack";

describe("The GuStack construct", () => {
  const warn = jest.spyOn(Logger, "warn");

  afterEach(() => {
    warn.mockReset();
  });

  it("requires passing the stack value as props", function () {
    const stack = simpleGuStackForTesting({ stack: "some-stack" });
    expect(stack.stack).toEqual("some-stack");
  });

  it("should have a stage parameter", () => {
    const stack = simpleGuStackForTesting({ stack: "test" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(json.Parameters).toEqual({
      Stage: {
        Type: "String",
        Description: "Stage name",
        AllowedValues: Stages,
        Default: Stage.CODE,
      },
    });
  });

  it("should apply the stack and stage tags to resources added to it", () => {
    const stack = new GuStack(new App(), "Test", { stack: "test" });

    new Role(stack, "MyRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    expect(stack).toHaveResource("AWS::IAM::Role", {
      Tags: alphabeticalTags([
        {
          Key: "Stack",
          Value: "test",
        },
        {
          Key: "Stage",
          Value: {
            Ref: "Stage",
          },
        },
        TrackingTag,
      ]),
    });
  });

  it("should return a parameter that exists", () => {
    const stack = new GuStack(new App(), "Test", { stack: "test" });
    const testParam = new GuParameter(stack, "MyTestParam", {});
    stack.setParam(testParam);

    const actual = stack.getParam<GuParameter>("MyTestParam");
    expect(actual).toBe(testParam);
  });

  it("should throw on attempt to get a parameter that doesn't exist", () => {
    const stack = new GuStack(new App(), "Test", { stack: "test" });

    expect(() => stack.getParam<GuParameter>("i-do-not-exist")).toThrowError(
      "Attempting to read parameter i-do-not-exist which does not exist"
    );
  });

  it("During the synthesise process, should advise updating with caution when it contains a stateful resource", () => {
    const stack = simpleGuStackForTesting();
    const bucket = new Bucket(stack, "MyBucket");
    SynthUtils.toCloudFormation(stack);

    // `defaultChild can technically be `undefined`.
    // We know a `Bucket` has a `defaultChild` so the coalescing is just appeasing the compiler.
    const cfnBucketResourcePath = bucket.node.defaultChild?.node.path ?? "";

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      `The resource '${cfnBucketResourcePath}' of type AWS::S3::Bucket is considered stateful by @guardian/cdk. Care should be taken when updating this resource to avoid accidental replacement as this could lead to downtime.`
    );
  });
});
