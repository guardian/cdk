import { Annotations, Template } from "aws-cdk-lib/assertions";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { simpleGuStackForTesting } from "../../../utils/test";
import { GuDeveloperPolicy } from "./developer-policy";

describe("GuDeveloperPolicy", () => {
  test("if a single policy statement is provided, the resulting Developer Policy resource's statement will have a single item", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicy(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Action: ["s3:GetObject"],
          Effect: "Allow",
          Resource: "s3:/log-bucket",
        }),
      ],
      grantId: "test123",
      description: "test policy",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::ManagedPolicy", {
      Description: "test policy",
      Path: "/developer-policy/test123/",
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
    new GuDeveloperPolicy(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Effect: "Allow",
          Action: ["s3:GetObject"],
          Resource: "*",
        }),
      ],
      grantId: "test123",
      description: "test policy",
    });
    Annotations.fromStack(stack).hasError("*", "Statement Resource is too broad: *");
  });

  test("adds an error if a wide-open resource/allow policy statement is present", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicy(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Effect: "Allow",
          Action: ["s3:GetObject"],
          Resource: "s3://*",
        }),
      ],
      grantId: "test123",
      description: "test policy",
    });
    Annotations.fromStack(stack).hasError("*", "Statement Resource is too broad: s3://*");
  });

  test("adds an error if a wide-open policy statement with no effect is present", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicy(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Action: ["*"],
          Resource: "s3:*",
        }),
      ],
      grantId: "test123",
      description: "test policy",
    });
    Annotations.fromStack(stack).hasError("*", "Statement Action is too broad: *");
  });

  test("does not add an error if a wide-open policy statement with a Deny effect is present", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicy(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Effect: "Deny",
          Action: ["*"],
          Resource: "arn:aws:s3:us-east-2:111122223333:table/*",
        }),
      ],
      grantId: "test123",
      description: "test policy",
    });
    Annotations.fromStack(stack).hasNoError("*", "Statement Action is too broad: *");
  });

  test("adds an error if a wide-open action/allow policy statement is present", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicy(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Effect: "Allow",
          Action: ["*"],
          Resource: "s3:*",
        }),
      ],
      grantId: "test123",
      description: "test policy",
    });
    Annotations.fromStack(stack).hasError("*", "Statement Action is too broad: *");
  });

  test("adds an error if a wide-open statement resource is requested", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicy(stack, "AllowS3GetObject", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:GetObject"],
          resources: ["*"],
        }),
      ],
      grantId: "test123",
      description: "test policy",
    });
    Annotations.fromStack(stack).hasError("*", "Statement Resource is too broad: *");
  });

  test("adds an error if a wide-open statement action is requested", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicy(stack, "AllowS3GetObject", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["*"],
          resources: ["s3://*"],
        }),
      ],
      grantId: "test123",
      description: "test policy",
    });
    Annotations.fromStack(stack).hasError("*", "Statement Action is too broad: *");
  });

  test("adds an error if both a wide-open statement action and a resource is requested", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicy(stack, "AllowS3GetObject", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["*"],
          resources: ["arn:aws:s3:::*"],
        }),
      ],
      grantId: "test123",
      description: "test policy",
    });
    Annotations.fromStack(stack).hasError("*", "Statement Action is too broad: *");
    Annotations.fromStack(stack).hasError("*", "Statement Resource is too broad: arn:aws:s3:::*");
  });
});
