import { RemovalPolicy } from "aws-cdk-lib";
import type { BucketProps } from "aws-cdk-lib/aws-s3";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { GuMigratableConstruct } from "../../utils/mixin";
import { GuAppAwareConstruct } from "../../utils/mixin/app-aware-construct";
import type { AppIdentity, GuMigratingResource, GuStack } from "../core";

export interface GuS3BucketProps extends GuMigratingResource, Omit<BucketProps, "removalPolicy">, AppIdentity {}

/**
 * A construct to create a bucket with a "retain" policy to prevent it from being deleted. It will be orphaned instead.
 */
export class GuS3Bucket extends GuMigratableConstruct(GuAppAwareConstruct(Bucket)) {
  constructor(scope: GuStack, id: string, props: GuS3BucketProps) {
    super(scope, id, {
      removalPolicy: RemovalPolicy.RETAIN,
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      ...props,
    });
  }
}
