import { RemovalPolicy } from "aws-cdk-lib";
import {
  ImageTagMutabilityExclusionFilter,
  Repository,
  RepositoryEncryption,
  TagMutability,
} from "aws-cdk-lib/aws-ecr";
import { AccountPrincipal, Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { GuStack } from "../core";
import { GuAllowPolicy } from "../iam";
import { GuGithubActionsRole } from "../iam/roles/github-actions";

const GUARDIAN_AWS_ORGANISATION_ID = "o-733s9vnx22";

export interface GuEcrRepositoryProps {
  repository: ImmutableGithubSlug;
}

type ImmutableGithubSlug = `${string}@${number}/${string}@${number}`;

const toMutableSlug = (slug: ImmutableGithubSlug): `${string}/${string}` => {
  const [immutableOrganisation, immutableRepository] = slug.split("/");

  if (!immutableOrganisation || !immutableRepository) {
    throw new Error(`Invalid GitHub slug: ${slug}`);
  }

  const [organisation] = immutableOrganisation.split("@");
  const [repository] = immutableRepository.split("@");

  if (!organisation || !repository) {
    throw new Error(`Invalid GitHub slug: ${slug}`);
  }

  return `${organisation}/${repository}`;
};

export class GuEcrRepository extends Repository {
  /**
   * An IAM Role that can be assumed by GitHub Actions (via `AssumeRoleWithWebIdentity`) which is
   * only able to push images to this repository.
   */
  public readonly pushRole: GuGithubActionsRole;

  constructor(scope: GuStack, id: string, props: GuEcrRepositoryProps) {
    const { repository } = props;

    const mutableSlug = toMutableSlug(repository);
    const app = scope.app ?? mutableSlug.split("/")[1];

    super(scope, id, {
      repositoryName: `${mutableSlug}/${app}`,
      encryption: RepositoryEncryption.AES_256,
      removalPolicy: RemovalPolicy.RETAIN,
      emptyOnDelete: false,
      imageScanOnPush: true,
      imageTagMutability: TagMutability.IMMUTABLE_WITH_EXCLUSION,
      imageTagMutabilityExclusionFilters: [
        ImageTagMutabilityExclusionFilter.wildcard("latest"),
        ImageTagMutabilityExclusionFilter.wildcard("branch-*"),
      ],
    });

    this.addToResourcePolicy(
      new PolicyStatement({
        principals: [new AccountPrincipal("*")],
        effect: Effect.ALLOW,
        actions: ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"],
        conditions: {
          "ForAnyValue:StringLike": {
            "aws:PrincipalOrgPaths": `${GUARDIAN_AWS_ORGANISATION_ID}/*`,
          },
        },
      }),
    );

    this.pushRole = new GuGithubActionsRole(scope, `${id}GithubActionsRole`, {
      policies: [
        new GuAllowPolicy(scope, `${id}ReadFromECR`, {
          actions: ["ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage"],
          resources: ["*"],
        }),
      ],
      condition: {
        repository,
      },
    });

    this.grantPush(this.pushRole);
  }
}
