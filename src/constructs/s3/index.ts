import type { Duration } from "aws-cdk-lib";
import { RemovalPolicy } from "aws-cdk-lib";
import type { BucketProps } from "aws-cdk-lib/aws-s3";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import type { IConstruct } from "constructs";
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

interface GuS3OriginBucketDeploymentProps {
  /**
   * Customises the SSM Parameter path, making it stage agnostic.
   * Useful when a single bucket is used across multiple stages.
   *
   * When `false` the path will be `/<STAGE>/<STACK>/<APP>/<APP>-origin-bucket`.
   * When `true` the path will be `/<STACK>/<APP>/<APP>-origin-bucket`.
   *
   * @default false
   */
  withoutStageAwareness: boolean;

  /**
   * Used to configure `bucketSsmKeyStageParam` in a generated `riff-raff.yaml` file.
   *
   * The SSM Parameter path, without a stage prefix.
   *
   * Not settable by user.
   *
   * @internal
   */
  baseParameterName: string;

  /**
   * Used to configure `cacheControl` in a generated `riff-raff.yaml` file.
   * Only needed if you're also using {@link GuRootExperimental}.
   *
   * Set the cache control header for the uploaded files.
   *
   * The key is a regular expression to match uploaded files.
   * The value is the max-age to set in the `Cache-Control` header.
   *
   * @example
   * To cache all files for one hour:
   * ```ts
   * { ".*", Duration.hours(1) }
   * ```
   *
   * @default cache nothing
   * @see https://riffraff.gutools.co.uk/docs/magenta-lib/types#awss3
   */
  cacheControl: Record<string, Duration>;

  /**
   * Used to configure `surrogateControl` in a generated `riff-raff.yaml` file.
   * Only needed if you're also using {@link GuRootExperimental}.
   *
   * Same as [[cacheControl]], but for setting the surrogate-control cache header, which is used by Fastly.
   *
   * @see https://riffraff.gutools.co.uk/docs/magenta-lib/types#awss3
   */
  surrogateControl: Record<string, Duration>;

  /**
   * Used to configure `mimeTypes` in a generated `riff-raff.yaml` file.
   * Only needed if you're also using {@link GuRootExperimental}.
   *
   * A map of file extension to MIME type.
   *
   * When a file is uploaded with a file extension that is in this map, the Content-Type header will be set to the MIME type provided.
   *
   * @example
   * ```ts
   * { "xpi", "application/x-xpinstall" }
   * ```
   *
   * @see https://riffraff.gutools.co.uk/docs/magenta-lib/types#awss3
   */
  mimeTypes: Record<string, string>;
}

export interface GuS3OriginBucketProps
  extends GuS3BucketProps,
    Partial<Omit<GuS3OriginBucketDeploymentProps, "baseParameterName">> {}

/**
 * An S3 bucket for use as an origin for a static site.
 * The bucket name will be stored in an SSM Parameter.
 * Other infrastructure, or applications, that use this bucket should discover its name by the Parameter.
 */
// implementing `IConstruct` is a no-op here as `Bucket` ultimately does so already. We explicitly do so to avoid a `SuspiciousTypeOfGuard` warning in `riff-raff-yaml-file/index.ts`.
export class GuS3OriginBucket extends GuS3Bucket implements IConstruct {
  /**
   * The name of the created SSM Parameter.
   */
  public readonly parameterName: string;

  public readonly app: string;

  /**
   * For internal use only, used to generate a `riff-raff.yaml` file.
   *
   * @see [[RiffRaffYamlFileExperimental]]
   * @internal
   */
  public readonly _deploymentProps: Required<GuS3OriginBucketDeploymentProps>;

  constructor(scope: GuStack, id: string, props: GuS3OriginBucketProps) {
    const { stage, stack } = scope;
    const { app, withoutStageAwareness = false, cacheControl = {}, surrogateControl = {}, mimeTypes = {} } = props;

    super(scope, id, props);

    this.app = app;

    const stageAgnosticParameterParts = [stack, app, `${app}-origin-bucket`];
    const parameterParts = withoutStageAwareness
      ? stageAgnosticParameterParts
      : [stage, ...stageAgnosticParameterParts];

    this.parameterName = `/${parameterParts.join("/")}`;

    new StringParameter(scope, `${id}-ssm-param`, {
      parameterName: this.parameterName,
      stringValue: this.bucketName,
    });

    this._deploymentProps = {
      withoutStageAwareness,
      cacheControl,
      surrogateControl,
      mimeTypes,
      baseParameterName: `/${stageAgnosticParameterParts.join("/")}`,
    };
  }
}
