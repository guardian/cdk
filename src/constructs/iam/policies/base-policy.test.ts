import { Template } from "aws-cdk-lib/assertions";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuAllowPolicy, GuDenyPolicy } from "./base-policy";

describe("GuAllowPolicy", () => {
  test("if a single action is provided, the resulting resource's action will be a single item", () => {
    const stack = simpleGuStackForTesting();
    attachPolicyToTestRole(
      stack,
      new GuAllowPolicy(stack, "AllowS3GetObject", {
        actions: ["s3:GetObject"],
        resources: ["*"],
      })
    );

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "s3:GetObject",
            Effect: "Allow",
            Resource: "*",
          },
        ],
      },
    });
  });

  test("if multiple actions are provided, the resulting resource's action will be an array", () => {
    const stack = simpleGuStackForTesting();
    attachPolicyToTestRole(
      stack,
      new GuAllowPolicy(stack, "AllowS3GetObject", {
        actions: ["s3:GetObject", "s3:ListBucket"],
        resources: ["*"],
      })
    );

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: ["s3:GetObject", "s3:ListBucket"],
            Effect: "Allow",
            Resource: "*",
          },
        ],
      },
    });
  });
});

describe("GuDenyPolicy", () => {
  test("if a single action is provided, the resulting resource's action will be a single item", () => {
    const stack = simpleGuStackForTesting();
    attachPolicyToTestRole(
      stack,
      new GuDenyPolicy(stack, "DenyS3GetObject", {
        actions: ["s3:GetObject"],
        resources: ["*"],
      })
    );

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "s3:GetObject",
            Effect: "Deny",
            Resource: "*",
          },
        ],
      },
    });
  });

  test("if multiple actions are provided, the resulting resource's action will be an array", () => {
    const stack = simpleGuStackForTesting();
    attachPolicyToTestRole(
      stack,
      new GuDenyPolicy(stack, "DenyS3GetObject", {
        actions: ["s3:GetObject", "s3:ListBucket"],
        resources: ["*"],
      })
    );

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: ["s3:GetObject", "s3:ListBucket"],
            Effect: "Deny",
            Resource: "*",
          },
        ],
      },
    });
  });
});
