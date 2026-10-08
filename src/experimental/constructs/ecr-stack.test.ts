import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { GuInfraStackExperimental } from "./ecr-stack";

const stack = new GuInfraStackExperimental(new App(), "Test", {
  stack: "content-audit",
  app: "page-runner",
  githubSlug: "guardian@164318/content-audit@107111499",
});
const template = Template.fromStack(stack);

describe("The distributed ECR stack", () => {
  it("allows pull-only access from principals in the AWS organisation", () => {
    template.hasResourceProperties("AWS::ECR::Repository", {
      RepositoryName: "guardian/content-audit/page-runner",
      RepositoryPolicyText: {
        Statement: [
          {
            Action: ["ecr:BatchCheckLayerAvailability", "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"],
            Condition: {
              StringEquals: {
                "aws:PrincipalOrgID": "o-733s9vnx22",
              },
            },
            Effect: "Allow",
            Principal: {
              AWS: "*",
            },
            Sid: "AllowOrganisationPull",
          },
        ],
      },
    });
  });

  it("allows GitHub Actions to authenticate and pull from repositories in other accounts", () => {
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          {
            Action: "ecr:GetAuthorizationToken",
            Effect: "Allow",
            Resource: "*",
          },
          {
            Action: ["ecr:BatchCheckLayerAvailability", "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"],
            Effect: "Allow",
            Resource: "arn:aws:ecr:*:*:repository/*",
          },
        ]),
      },
      Roles: [
        {
          Ref: Match.stringLikeRegexp("GithubActionsRole"),
        },
      ],
    });
  });

  it("restricts the GitHub Actions role to the configured repository", () => {
    template.hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: "sts:AssumeRoleWithWebIdentity",
            Condition: {
              StringLike: {
                "token.actions.githubusercontent.com:sub": "repo:guardian@164318/content-audit@107111499:*",
              },
            },
          },
        ],
      },
    });
  });
});
