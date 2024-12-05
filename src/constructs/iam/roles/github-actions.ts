import { CfnOutput, CfnResource } from "aws-cdk-lib";
import { FederatedPrincipal } from "aws-cdk-lib/aws-iam";
import type { GuStack } from "../../core";
import type { GuPolicy } from "../policies";
import { GuRole } from "./roles";

const GITHUB_ACTIONS_ID_TOKEN_REQUEST_DOMAIN = "token.actions.githubusercontent.com";

/*
Thumbprint of `GITHUB_ACTIONS_ID_TOKEN_REQUEST_DOMAIN`.

See:
  - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
  - https://github.blog/changelog/2023-06-27-github-actions-update-on-oidc-integration-with-aws/
*/
const GITHUB_ACTIONS_ID_TOKEN_REQUEST_DOMAIN_THUMBPRINTS = [
  "6938fd4d98bab03faadb97b34396831e3780aea1",
  "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
];

export interface GuGithubActionsRepositoryCondition {
  /**
   * The GitHub organisation/user to constrain the IAM Role to.
   */
  githubOrganisation: string;

  /**
   * Repositories to constrain the IAM Role to.
   */
  repositories?: string;
}

const GuGithubActionsRepositoryCondition = {
  toString: ({ githubOrganisation, repositories }: GuGithubActionsRepositoryCondition): string =>
    `repo:${githubOrganisation}/${repositories ?? "*"}`,
};

const ALL_GUARDIAN_REPOSITORIES: GuGithubActionsRepositoryCondition = {
  githubOrganisation: "guardian",
  repositories: "*",
};

export interface GuGithubActionsRoleProps {
  /**
   * A list of IAM Policies for the GitHub Action.
   */
  policies: GuPolicy[];

  /**
   * Repositories where GitHub Actions can assumes this role.
   * Defaults to [[`ALL_GUARDIAN_REPOSITORIES`]].
   */
  condition?: GuGithubActionsRepositoryCondition;
}

/*
Note you can only have one of these per AWS account - `OIDCProvider`s are keyed by the
provider domain, ie `token.actions.githubusercontent.com`, so this must be instantiated
as a singleton. At the Guardian we do this in https://github.com/guardian/aws-account-setup .

AWS CDK implements an OIDCProvider as a custom resource.
This requires a lambda to be deployed into the account.
As far as I can tell, the lambda is automating the setting of `ThumbprintList`, which is quite generic.
It's simpler for us to be specific here.

See:
  - https://github.com/aws/aws-cdk/blob/851c8ca9989856fa61496ff113f9cb8c66d02f3b/packages/%40aws-cdk/aws-iam/lib/oidc-provider.ts
  - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html
 */
export class GitHubOidcProvider extends CfnResource {
  constructor(scope: GuStack) {
    super(scope, "GithubActionsOidc", {
      type: "AWS::IAM::OIDCProvider",
      properties: {
        Url: `https://${GITHUB_ACTIONS_ID_TOKEN_REQUEST_DOMAIN}`,
        ClientIdList: ["sts.amazonaws.com"],
        ThumbprintList: GITHUB_ACTIONS_ID_TOKEN_REQUEST_DOMAIN_THUMBPRINTS,
      },
    });
  }
}

/**
 * A construct to create an IAM role for GitHub Actions to assume via `AssumeRoleWithWebIdentity`.
 *
 * An Output will be added to the stack with the Role's ARN for use with https://github.com/aws-actions/configure-aws-credentials.
 *
 * See:
 *   - https://github.com/aws-actions/configure-aws-credentials
 *   - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html
 */
export class GuGithubActionsRole extends GuRole {
  constructor(scope: GuStack, props: GuGithubActionsRoleProps) {
    super(scope, "GithubActionsRole", {
      assumedBy: new FederatedPrincipal(
        `arn:aws:iam::${scope.account}:oidc-provider/${GITHUB_ACTIONS_ID_TOKEN_REQUEST_DOMAIN}`,
        {
          StringLike: {
            [`${GITHUB_ACTIONS_ID_TOKEN_REQUEST_DOMAIN}:sub`]: GuGithubActionsRepositoryCondition.toString(
              props.condition ?? ALL_GUARDIAN_REPOSITORIES,
            ),
          },
        },
        "sts:AssumeRoleWithWebIdentity",
      ),
    });

    props.policies.forEach((p) => p.attachToRole(this));

    new CfnOutput(this, `${this.node.id}-Arn`, { value: this.roleArn });
  }
}
