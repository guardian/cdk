import { Template } from "aws-cdk-lib/assertions";
import { Annotations } from "aws-cdk-lib/assertions";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { simpleGuStackForTesting } from "../../../../utils/test";
import { GuDeveloperPolicyExperimental } from "./developer-policy";

describe("GuDeveloperPolicyExperimental", () => {
  test("if a single action is provided, the resulting Workload Policy resource's statement will have a single item", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      allow: [
        {
          actions: ["s3:GetObject"],
          resources: ["s3:///log-bucket"],
        },
      ],
      permission: "test123",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::ManagedPolicy", {
      Path: "/developer-policy/test123/",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "s3:GetObject",
            Effect: "Allow",
            Resource: "s3:///log-bucket",
          },
        ],
      },
    });
  });

  test("if a single policy statement is provided, the resulting Workload Policy resource's statement will have a single item", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Action: ["s3:GetObject"],
          Effect: "Allow",
          Resource: "s3:///log-bucket",
        }),
      ],
      permission: "test123",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::ManagedPolicy", {
      Path: "/developer-policy/test123/",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "s3:GetObject",
            Effect: "Allow",
            Resource: "s3:///log-bucket",
          },
        ],
      },
    });
  });

  test("throws an error if a wide-open policy is allowed", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      allow: [
        {
          actions: ["s3:GetObject"],
          resources: ["*"],
        },
      ],
      permission: "test123",
    });
    Annotations.fromStack(stack).hasError("*", "Statement Resource is too broad");
  });

  test("throws an error if a wide-open allow policy statement is present", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        PolicyStatement.fromJson({
          Effect: "Allow",
          Action: ["s3:GetObject"],
          Resource: "*",
        }),
      ],
      permission: "test123",
    });
    Annotations.fromStack(stack).hasError("*", "Statement Resource is too broad");
  });

  test("throws an error if a wide-open statement is requested", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:GetObject"],
          resources: ["*"],
        }),
      ],
      permission: "test123",
    });
    Annotations.fromStack(stack).hasError("*", "Statement Resource is too broad");
  });

  test("throws an error if empty allow is provided", () => {
    const stack = simpleGuStackForTesting();
    expect(() => {
        new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
          allow: [],
          permission: "test123",
        });
    }).toThrow("Empty allow array passed to GuDeveloperPolicyExperimental");
  });

  test("throws an error if empty deny is provided", () => {
    const stack = simpleGuStackForTesting();
    expect(() => {
        new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
          allow: [
            {
              actions: ["s3:GetObject"],
              resources: ["s3:///log-bucket"],
            },
          ],
          deny: [],
          permission: "test123",
        });
    }).toThrow("Empty deny array passed to GuDeveloperPolicyExperimental");
  });

  test("throws an error if both deny and statements are not present", () => {
    const stack = simpleGuStackForTesting();
    expect(() => {
      new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
        deny: [
          {
            actions: ["s3:GetObject"],
            resources: ["s3:///log-bucket"],
          },
        ],
        permission: "test123",
      });
    }).toThrow("No statements or allow values passed to GuDeveloperPolicyExperimental");
  });

  test("if multiple actions are provided, the resulting Managed Policy resource's action will container all items", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicyExperimental(stack, "AllowS3GetObject", {
      allow: [
        {
          actions: ["s3:GetObject"],
          resources: ["arn:aws:s3:::mybucket/mypath"],
        },
        {
          actions: ["s3:GetObject"],
          resources: ["arn:aws:s3:::mybucket/myotherpath"],
        },
      ],
      deny: [
        {
          actions: ["s3:GetObject"],
          resources: ["arn:aws:s3:::mybucket/mypath/butnotthispath"],
        },
      ],
      permission: "test321",
      description: "testtesttest",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::ManagedPolicy", {
      Description: "testtesttest",
      Path: "/developer-policy/test321/",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "s3:GetObject",
            Effect: "Allow",
            Resource: "arn:aws:s3:::mybucket/mypath",
          },
          {
            Action: "s3:GetObject",
            Effect: "Allow",
            Resource: "arn:aws:s3:::mybucket/myotherpath",
          },
          {
            Action: "s3:GetObject",
            Effect: "Deny",
            Resource: "arn:aws:s3:::mybucket/mypath/butnotthispath",
          },
        ],
      },
    });
  });
});
