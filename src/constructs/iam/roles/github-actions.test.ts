import { Template } from "aws-cdk-lib/assertions";
import { simpleTestingResources } from "../../../utils/test";
import { GuGetS3ObjectsPolicy } from "../policies";
import { GuGithubActionsRole } from "./github-actions";

describe("The GitHubActionsRole construct", () => {
  it("should create the correct resources with minimal config", () => {
    const { stack, app } = simpleTestingResources();
    new GuGithubActionsRole(app, {
      policies: [
        new GuGetS3ObjectsPolicy(app, "GetObjects", {
          bucketName: "super-secret-stuff",
        }),
      ],
    });

    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should be possible to limit which repositories can assume the role", () => {
    const { stack, app } = simpleTestingResources();
    new GuGithubActionsRole(app, {
      policies: [
        new GuGetS3ObjectsPolicy(app, "GetObjects", {
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
});
