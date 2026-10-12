import { Template } from "aws-cdk-lib/assertions";
import { GuTemplate, simpleGuStackForTesting } from "../../../utils/test";
import { GuGetS3ObjectsPolicy } from "../policies";
import { GitHubOidcProvider, GuGithubActionsRole } from "./github-actions";

describe("The GitHubActionsRole construct", () => {
  it("should be possible to limit which repositories can assume the role", () => {
    const stack = simpleGuStackForTesting();
    new GuGithubActionsRole(stack, "GuGithubActionsRole", {
      policies: [
        new GuGetS3ObjectsPolicy(stack, "GetObjects", {
          bucketName: "super-secret-stuff",
        }),
      ],
      condition: {
        repository: "guardian@111111/platform@111111",
      },
    });

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: "sts:AssumeRoleWithWebIdentity",
            Condition: {
              StringLike: {
                "token.actions.githubusercontent.com:sub": "repo:guardian@111111/platform@111111:*",
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
