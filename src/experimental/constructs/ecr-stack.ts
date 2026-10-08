import type { App } from "aws-cdk-lib";
import { Repository, TagMutability } from "aws-cdk-lib/aws-ecr";
import { AnyPrincipal, Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { GuStack, type GuStackProps } from "../../constructs/core";
import { GuGithubActionsRole, GuPolicy } from "../../constructs/iam";

const AWS_ORGANISATION_ID = "o-733s9vnx22";
const ECR_PULL_ACTIONS = ["ecr:BatchCheckLayerAvailability", "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"];

// New github slug format: guardian@164318/dotcom-rendering@107111499
type GithubSlug = `${string}@${number}/${string}@${number}`;

export interface GuInfraStackProps extends Omit<GuStackProps, "stage"> {
  stage?: GuStackProps["stage"];
  githubSlug: GithubSlug;
}

const parseRepoSlug = (
  repoSlug: GithubSlug,
): {
  orgName: string;
  orgId: string;
  repoName: string;
  repoId: string;
} => {
  const [org, repo] = repoSlug.split("/");
  if (!org || !repo) {
    throw Error("No org or repo name");
  }

  const [orgName, orgId] = org.split("@");
  const [repoName, repoId] = repo.split("@");

  if (!orgName || !orgId || !repoName || !repoId) {
    throw Error("Could not parse repository name.");
  }

  return {
    orgName,
    orgId,
    repoName,
    repoId,
  };
};

export class GuInfraStackExperimental extends GuStack {
  // eslint-disable-next-line custom-rules/valid-constructors -- GuStack subclasses are App-scoped, unlike constructs within a GuStack.
  constructor(scope: App, id: string, props: GuInfraStackProps) {
    super(scope, id, { ...props, stage: props.stage ?? "INFRA" });

    const { app, githubSlug } = props;
    const { orgName, orgId, repoName, repoId } = parseRepoSlug(githubSlug);

    const ecrRepo = new Repository(this, "PageRunnerRepository", {
      repositoryName: `${orgName}/${repoName}/${app ?? repoName}`,
      imageTagMutability: TagMutability.MUTABLE,
      imageScanOnPush: true,
    });

    ecrRepo.addToResourcePolicy(
      new PolicyStatement({
        sid: "AllowOrganisationPull",
        effect: Effect.ALLOW,
        principals: [new AnyPrincipal()],
        actions: ECR_PULL_ACTIONS,
        conditions: {
          StringEquals: {
            "aws:PrincipalOrgID": AWS_ORGANISATION_ID,
          },
        },
      }),
    );

    const pullFromOrganisationRepositories = new GuPolicy(this, "PullFromOrganisationRepositories", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["ecr:GetAuthorizationToken"],
          resources: ["*"],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ECR_PULL_ACTIONS,
          resources: ["arn:aws:ecr:*:*:repository/*"],
        }),
      ],
    });

    // Allow GHA to publish locally and pull from repositories shared across the organisation.
    const role = new GuGithubActionsRole(this, {
      policies: [pullFromOrganisationRepositories],
      condition: {
        githubOrganisation: `${orgName}@${orgId}`,
        repositories: `${repoName}@${repoId}:*`,
      },
    });

    ecrRepo.grantPullPush(role);
  }
}
