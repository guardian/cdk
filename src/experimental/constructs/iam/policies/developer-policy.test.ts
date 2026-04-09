import { App } from "aws-cdk-lib";
import { Annotations, Match, Template } from "aws-cdk-lib/assertions";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { ContextKeys } from "../../../../constants";
import { GuStack } from "../../../../constructs/core";
import { simpleGuStackForTesting } from "../../../../utils/test";
import { GuDeveloperPolicyExperimental } from "./developer-policy";

describe("GuDeveloperPolicyExperimental", () => {
  test("if a single policy statement is provided, the resulting Developer Policy resource's statement will have a single item", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Action: ["s3:GetObject"],
          Effect: "Allow",
          Resource: "s3:/log-bucket",
        }),
      ],
      grantId: "test123",
      friendlyName: "test policy",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::ManagedPolicy", {
      Path: "/developer-policy/guardian/cdk/test123/",
      Description: "test policy",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "s3:GetObject",
            Effect: "Allow",
            Resource: "s3:/log-bucket",
          },
        ],
      },
    });
  });

  test("adds an error if a wide-open resource/allow policy statement is present", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Effect: "Allow",
          Action: ["s3:GetObject"],
          Resource: "*",
        }),
      ],
      grantId: "test123",
      friendlyName: "test policy",
    });

    Annotations.fromStack(stack).hasError(
      "*",
      "Statement Resource is too broad: *. If this is necessary and intended, use withoutPolicyChecks: true in properties to turn off this check",
    );
  });

  test("adds an error if a wide-open resource/allow policy statement is present", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Effect: "Allow",
          Action: ["s3:GetObject"],
          Resource: "s3://*",
        }),
      ],
      grantId: "test123",
      friendlyName: "test policy",
    });
    Annotations.fromStack(stack).hasError(
      "*",
      "Statement Resource is too broad: s3://*. If this is necessary and intended, use withoutPolicyChecks: true in properties to turn off this check",
    );
  });

  test("adds an error if a wide-open policy statement with no effect is present", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Action: ["*"],
          Resource: "s3:*",
        }),
      ],
      grantId: "test123",
      friendlyName: "test policy",
    });
    Annotations.fromStack(stack).hasError(
      "*",
      "Statement Action is too broad: *. If this is necessary and intended, use withoutPolicyChecks: true in properties to turn off this check",
    );
  });

  test("does not add an error if a wide-open policy statement with a Deny effect is present", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Effect: "Deny",
          Action: ["*"],
          Resource: "arn:aws:s3:us-east-2:111122223333:table/*",
        }),
      ],
      grantId: "test123",
      friendlyName: "test policy",
    });
    Annotations.fromStack(stack).hasNoError(
      "*",
      "Statement Action is too broad: *. If this is necessary and intended, use withoutPolicyChecks: true in properties to turn off this check",
    );
  });

  test("adds an error if a wide-open action/allow policy statement is present", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Effect: "Allow",
          Action: ["*"],
          Resource: "s3:*",
        }),
      ],
      grantId: "test123",
      friendlyName: "test policy",
    });
    Annotations.fromStack(stack).hasError(
      "*",
      "Statement Action is too broad: *. If this is necessary and intended, use withoutPolicyChecks: true in properties to turn off this check",
    );
  });

  test("does not add an error if a wide-open action/allow policy statement is present but the withoutPolicyChecks marker is used", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Effect: "Allow",
          Action: ["*"],
          Resource: "s3:*",
        }),
      ],
      grantId: "test123",
      friendlyName: "test policy",
      withoutPolicyChecks: true,
    });
    Annotations.fromStack(stack).hasNoError(
      "*",
      "Statement Action is too broad: *. If this is necessary and intended, use withoutPolicyChecks: true in properties to turn off this check",
    );
  });

  test("do not add an error if a wide-open action/allow policy statement is present and the withoutPolicyChecks marker is used but false", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Effect: "Allow",
          Action: ["*"],
          Resource: "s3:*",
        }),
      ],
      grantId: "test123",
      friendlyName: "test policy",
      withoutPolicyChecks: false,
    });
    Annotations.fromStack(stack).hasError(
      "*",
      "Statement Action is too broad: *. If this is necessary and intended, use withoutPolicyChecks: true in properties to turn off this check",
    );
  });

  test("adds an error if a wide-open statement resource is requested", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:GetObject"],
          resources: ["*"],
        }),
      ],
      grantId: "test123",
      friendlyName: "test policy",
    });
    Annotations.fromStack(stack).hasError(
      "*",
      "Statement Resource is too broad: *. If this is necessary and intended, use withoutPolicyChecks: true in properties to turn off this check",
    );
  });

  test("adds an error if a wide-open statement action is requested", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["*"],
          resources: ["s3://*"],
        }),
      ],
      grantId: "test123",
      friendlyName: "test policy",
    });
    Annotations.fromStack(stack).hasError(
      "*",
      "Statement Action is too broad: *. If this is necessary and intended, use withoutPolicyChecks: true in properties to turn off this check",
    );
  });

  test("adds an error if both a wide-open statement action and a resource is requested", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["*"],
          resources: ["arn:aws:s3:::*"],
        }),
      ],
      grantId: "test123",
      friendlyName: "test policy",
    });
    Annotations.fromStack(stack).hasError(
      "*",
      "Statement Action is too broad: *. If this is necessary and intended, use withoutPolicyChecks: true in properties to turn off this check",
    );
    Annotations.fromStack(stack).hasError(
      "*",
      "Statement Resource is too broad: arn:aws:s3:::*. If this is necessary and intended, use withoutPolicyChecks: true in properties to turn off this check",
    );
  });

  test("constructs the path using the repository name derived from context", () => {
    const stack = new GuStack(
      new App({ context: { [ContextKeys.REPOSITORY_URL]: "https://github.com/guardian/my-repo" } }),
      "Test",
      { stack: "test-stack", stage: "TEST" },
    );

    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Action: ["s3:GetObject"],
          Effect: "Allow",
          Resource: "arn:aws:s3:::my-bucket/my-path",
        }),
      ],
      grantId: "test123",
      friendlyName: "test policy",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::ManagedPolicy", {
      Path: "/developer-policy/guardian/my-repo/test123/",
    });
  });

  test("adds an error if friendlyName is empty", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Action: ["s3:GetObject"],
          Effect: "Allow",
          Resource: "arn:aws:s3:::my-bucket/path",
        }),
      ],
      grantId: "test123",
      friendlyName: "",
    });
    Annotations.fromStack(stack).hasError("*", "friendlyName must be filled in");
  });

  test("adds an error if friendlyName exceeds 60 characters", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Action: ["s3:GetObject"],
          Effect: "Allow",
          Resource: "arn:aws:s3:::my-bucket/path",
        }),
      ],
      grantId: "test123",
      friendlyName: "a".repeat(61),
    });
    Annotations.fromStack(stack).hasError(
      "*",
      "friendlyName must be no more than 60 characters long, but was 61 characters",
    );
  });

  test("does not add an error if friendlyName is exactly 60 characters", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Action: ["s3:GetObject"],
          Effect: "Allow",
          Resource: "arn:aws:s3:::my-bucket/path",
        }),
      ],
      grantId: "test123",
      friendlyName: "a".repeat(60),
    });
    Annotations.fromStack(stack).hasNoError("*", Match.anyValue());
  });

  test("adds an error if friendlyName exceeds 60 characters even when withoutPolicyChecks is true", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Action: ["s3:GetObject"],
          Effect: "Allow",
          Resource: "arn:aws:s3:::my-bucket/path",
        }),
      ],
      grantId: "test123",
      friendlyName: "a".repeat(61),
      withoutPolicyChecks: true,
    });
    Annotations.fromStack(stack).hasError(
      "*",
      "friendlyName must be no more than 60 characters long, but was 61 characters",
    );
  });
});
