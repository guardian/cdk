import "@aws-cdk/assert/jest";

import "../../utils/test/jest";
import { App } from "aws-cdk-lib";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { ContextKeys, TagKeys } from "../../constants";
import { GuParameter } from "./parameters";
import { GuStack } from "./stack";

describe("The GuStack construct", () => {
  it("should apply the stack and stage tags to resources added to it", () => {
    const stack = new GuStack(new App(), "Test", { stack: "test", stage: "TEST" });

    new Role(stack, "MyRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    expect(stack).toHaveGuTaggedResource("AWS::IAM::Role");
  });

  it("should not apply any tags when withoutTags is set to true", () => {
    const stack = new GuStack(new App(), "Test", { stack: "test", stage: "TEST", withoutTags: true });

    new Role(stack, "MyRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    expect(stack).not.toHaveGuTaggedResource("AWS::IAM::Role");
  });

  it("should prefer context values for repository information", () => {
    const stack = new GuStack(new App({ context: { [ContextKeys.REPOSITORY_URL]: "my-repository" } }), "Test", {
      stack: "test",
      stage: "TEST",
    });

    new Role(stack, "MyRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    expect(stack).toHaveGuTaggedResource("AWS::IAM::Role", {
      additionalTags: [
        {
          Key: TagKeys.REPOSITORY_NAME,
          Value: "my-repository",
        },
      ],
    });
  });

  it("should return a parameter that exists", () => {
    const stack = new GuStack(new App(), "Test", { stack: "test", stage: "TEST" });
    const testParam = new GuParameter(stack, "MyTestParam", {});
    stack.setParam(testParam);

    const actual = stack.getParam<GuParameter>("MyTestParam");
    expect(actual).toBe(testParam);
  });

  it("should throw on attempt to get a parameter that doesn't exist", () => {
    const stack = new GuStack(new App(), "Test", { stack: "test", stage: "TEST" });

    expect(() => stack.getParam<GuParameter>("i-do-not-exist")).toThrowError(
      "Attempting to read parameter i-do-not-exist which does not exist"
    );
  });
});
