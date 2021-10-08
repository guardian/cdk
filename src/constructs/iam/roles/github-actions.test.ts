import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { simpleGuStackForTesting } from "../../../utils/test";
import { GuGetS3ObjectsPolicy } from "../policies";
import { GuGithubActionsRole } from "./github-actions";

describe("The GitHubActionsRole construct", () => {
  it("should create the correct resources with minimal config", () => {
    const stack = simpleGuStackForTesting();
    new GuGithubActionsRole(stack, {
      policies: [
        new GuGetS3ObjectsPolicy(stack, "GetObjects", {
          bucketName: "super-secret-stuff",
        }),
      ],
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should be possible to limit which repositories can assume the role", () => {
    const stack = simpleGuStackForTesting();
    new GuGithubActionsRole(stack, {
      policies: [
        new GuGetS3ObjectsPolicy(stack, "GetObjects", {
          bucketName: "super-secret-stuff",
        }),
      ],
      condition: {
        githubOrganisation: "guardian",
        repositories: "platform-*",
      },
    });

    expect(stack).toHaveResourceLike("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: "sts:AssumeRoleWithWebIdentity",
            Condition: {
              StringLike: {
                "token.actions.githubusercontent.com:sub": "repo:guardian/platform-*",
              },
            },
          },
        ],
      },
    });
  });
});
