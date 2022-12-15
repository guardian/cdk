import { RemovalPolicy } from "aws-cdk-lib";
import type { BucketProps } from "aws-cdk-lib/aws-s3";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { GuAppAwareConstruct } from "../../utils/mixin/app-aware-construct";
import type { AppIdentity, GuStack } from "../core";

export interface GuS3BucketProps extends Omit<BucketProps, "removalPolicy">, AppIdentity {}

/**
 * A construct to create a bucket with a "retain" policy to prevent it from being deleted. It will be orphaned instead.
 */
export class GuS3Bucket extends GuAppAwareConstruct(Bucket) {
  constructor(scope: GuStack, id: string, props: GuS3BucketProps) {
    super(scope, id, {
      removalPolicy: RemovalPolicy.RETAIN,
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      ...props,
    });
  }
}

export interface GuS3OriginBucketProps extends GuS3BucketProps {
  /**
   * Customises the SSM Parameter path, making it stage agnostic.
   * Useful when a single bucket is used across multiple stages.
   *
   * When `false` the path will be `/<STAGE>/<STACK>/<APP>/<APP>-origin-bucket`.
   * When `true` the path will be `/<STACK>/<APP>/<APP>-origin-bucket`.
   *
   * @default false
   */
  withoutStageAwareness?: boolean;
}

/**
 * An S3 bucket for use as an origin for a static site.
 * The bucket name will be stored in an SSM Parameter.
 * Other infrastructure, or applications, that use this bucket should discover its name by the Parameter.
 */
export class GuS3OriginBucket extends GuS3Bucket {
  /**
   * The name of the created SSM Parameter.
   */
  public readonly parameterName: string;

  constructor(scope: GuStack, id: string, props: GuS3OriginBucketProps) {
    const { stage, stack } = scope;
    const { app, withoutStageAwareness = false } = props;

    super(scope, id, props);

    const stageAgnosticParameterParts = [stack, app, `${app}-origin-bucket`];
    const parameterParts = withoutStageAwareness
      ? stageAgnosticParameterParts
      : [stage, ...stageAgnosticParameterParts];

    this.parameterName = `/${parameterParts.join("/")}`;

    new StringParameter(scope, `${id}-ssm-param`, {
      parameterName: this.parameterName,
      stringValue: this.bucketName,
    });
  }
}
