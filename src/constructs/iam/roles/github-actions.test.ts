import { Template } from "aws-cdk-lib/assertions";
import { GuTemplate, simpleGuStackForTesting } from "../../../utils/test";
import { GuGetS3ObjectsPolicy } from "../policies";
import { GitHubOidcProvider, GuGithubActionsRole } from "./github-actions";

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

    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
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

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Role", {
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

  // See https://github.blog/changelog/2026-04-23-immutable-subject-claims-for-github-actions-oidc-tokens/
  it("should be possible to use the immutable OIDC subject claim format", () => {
    const stack = simpleGuStackForTesting();
    new GuGithubActionsRole(stack, {
      policies: [
        new GuGetS3ObjectsPolicy(stack, "GetObjects", {
          bucketName: "super-secret-stuff",
        }),
      ],
      condition: {
        githubOrganisation: "octocat@123456",
        repositories: "my-repo@456789:*", // trailing `:*` to mean any branch in the repository
      },
    });

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: "sts:AssumeRoleWithWebIdentity",
            Condition: {
              StringLike: {
                "token.actions.githubusercontent.com:sub": "repo:octocat@123456/my-repo@456789:*",
              },
            },
          },
        ],
      },
    });
  });
});

describe("The GitHubOidcProvider construct", () => {
  it("should be tagged correctly", () => {
    const stack = simpleGuStackForTesting();
    new GitHubOidcProvider(stack);

    GuTemplate.fromStack(stack).hasGuTaggedResource("AWS::IAM::OIDCProvider");
  });
});
