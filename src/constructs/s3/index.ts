import type { BucketProps } from "@aws-cdk/aws-s3";
import { Bucket } from "@aws-cdk/aws-s3";
import { RemovalPolicy } from "@aws-cdk/core";
import { GuMigratableConstruct } from "../../utils/mixin";
import type { GuStack } from "../core";
import type { GuMigratingResource } from "../core/migrating";

export interface GuS3BucketProps extends GuMigratingResource, Omit<BucketProps, "removalPolicy"> {}

/**
 * A construct to create a bucket with a "retain" policy to prevent it from being deleted. It will be orphaned instead.
 */
export class GuS3Bucket extends GuMigratableConstruct(Bucket) {
  constructor(scope: GuStack, id: string, props: GuS3BucketProps) {
    super(scope, id, { ...props, removalPolicy: RemovalPolicy.RETAIN });
  }
}
