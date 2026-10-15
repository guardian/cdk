import { Stack } from "aws-cdk-lib";
import { RepositoryBase } from "aws-cdk-lib/aws-ecr";
import { ContainerImage } from "aws-cdk-lib/aws-ecs";
import type { AddToResourcePolicyResult } from "aws-cdk-lib/aws-iam";
import type { GithubRepositoryName } from "../../types";
import { GuArtifactsAccountId } from "../core";
import type { GuStack } from "../core";

// Should follow the following pattern: `{Github Organisation}/{Github Repository}/{App Name}`
export type CentralRepositoryName = `${GithubRepositoryName}/${string}`;
export type GuRepositoryProps = {
  // The name of the ECR repository, must follow the pattern `guardian/{Github Repository}/{App Name}`
  name: CentralRepositoryName;
};

/**
 * A construct representing an ECR repository in the central artifacts account.
 * This repository is assumed to exist in the central artifacts account and is not created by this construct.
 *
 * Use `getImage` to obtain a `ContainerImage` for this repository.
 */
export class GuRepository extends RepositoryBase {
  readonly repositoryName: string;
  readonly repositoryArn: string;

  constructor(scope: GuStack, id: string, props: GuRepositoryProps) {
    super(scope, id);

    const arn = Stack.of(scope).formatArn({
      service: "ecr",
      resource: "repository",
      resourceName: props.name,
      account: GuArtifactsAccountId.getInstance(scope).valueAsString,
      // Central ECR is currently only deployed to eu-west-1, applications in other regions should continue to use eu-west-1
      region: "eu-west-1",
    });

    this.repositoryArn = arn;
    this.repositoryName = props.name;
  }

  addToResourcePolicy(): AddToResourcePolicyResult {
    // See aws-cdk implementation of fromRepositoryArn
    // https://github.com/aws/aws-cdk/blob/173a2ff9551d7c92c050bd33f775c1e4a1eb9ad8/packages/aws-cdk-lib/aws-ecr/lib/repository.ts#L749
    return { statementAdded: false };
  }

  /**
   * Reference an image in this repository.
   *
   * @see ContainerImage.fromEcrRepository
   * @param tag a docker tag or digest
   * @returns a `ContainerImage` representing the specified tag or digest of this repository.
   */
  getImage(tag: string) {
    return ContainerImage.fromEcrRepository(this, tag);
  }
}
