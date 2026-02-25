import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../../utils/test";
import { GuDeveloperPolicy } from "./developer-policy";

describe("GuDeveloperPolicy", () => {
  test("if a single action is provided, the resulting Workload Policy resource's statement will have a single item", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicy(stack, "AllowS3GetObject", {
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

  test("throws an error if a wide-open permissions is requested", () => {
    const stack = simpleGuStackForTesting();
    expect(() => {
      new GuDeveloperPolicy(stack, "AllowS3GetObject", {
        allow: [
          {
            actions: ["s3:GetObject"],
            resources: ["*"],
          },
        ],
        permission: "test123",
      });
    }).toThrow("Overly broad permission present, see annotations for details");
  });

  test("if multiple actions are provided, the resulting Managed Policy resource's action will container all items", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicy(stack, "AllowS3GetObject", {
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
