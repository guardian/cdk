import { RemovalPolicy } from "aws-cdk-lib";
import type { BucketProps } from "aws-cdk-lib/aws-s3";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import type { GuApp } from "../core";

export type GuS3BucketProps = Omit<BucketProps, "removalPolicy">;

/**
 * A construct to create a bucket with a "retain" policy to prevent it from being deleted. It will be orphaned instead.
 */
export class GuS3Bucket extends Bucket {
  constructor(scope: GuApp, id: string, props: GuS3BucketProps) {
    super(scope, id, {
      removalPolicy: RemovalPolicy.RETAIN,
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      ...props,
    });
  }
}
