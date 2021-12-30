import { Certificate } from "@aws-cdk/aws-certificatemanager";
import {
  CloudFrontWebDistribution,
  OriginAccessIdentity,
  ViewerCertificate,
  ViewerProtocolPolicy,
} from "@aws-cdk/aws-cloudfront";
import type { Behavior, CloudFrontWebDistributionProps } from "@aws-cdk/aws-cloudfront/lib/web-distribution";
import { CanonicalUserPrincipal, PolicyStatement } from "@aws-cdk/aws-iam";
import { Bucket } from "@aws-cdk/aws-s3";
import { Annotations, Arn, ArnFormat, CfnOutput, Duration, Token } from "@aws-cdk/core";
import { Stage } from "../../constants";
import type { GuDomainNameProps } from "../../types/domain-names";
import { StageAwareValue } from "../../types/stage";
import { GuAppAwareConstruct } from "../../utils/mixin/app-aware-construct";
import { GuCertificate } from "../acm";
import type { GuStack } from "../core";
import { AppIdentity } from "../core/identity";
import { GuCname } from "../dns";
import { GuS3Bucket } from "../s3";

const GLOBAL_AWS_REGION = "us-east-1";
const CLOUDFRONT_CERTIFICATE_REQUIREMENT_MESSAGE = `CloudFront requires ACM certificates from the ${GLOBAL_AWS_REGION} region.`;
const ACM_ARN_RESOURCE = "certificate";

export interface GuStaticSiteProps
  extends Omit<CloudFrontWebDistributionProps, "originConfigs" | "comment" | "viewerCertificate">,
    AppIdentity {
  /**
   * Domain the CloudFront distribution should be aliased as.
   *
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudfront-distribution-distributionconfig.html#cfn-cloudfront-distribution-distributionconfig-aliases
   */
  domainNameProps: GuDomainNameProps;

  /**
   * ARN of a pre-existing ACM certificate to attach to CloudFront. It must:
   *   - exist in the us-east-1 region
   *   - not have a hard coded account number
   *
   * If not provided, a new certificate is created. Note, this means the stack must be deployed in the us-east-1 region.
   *
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudfront-distribution-viewercertificate.html#cfn-cloudfront-distribution-viewercertificate-acmcertificatearn
   */
  preExistingCertificateArn?: StageAwareValue<string>;

  /**
   * Name of a pre-existing S3 bucket holding the contents of the static site.
   *
   * If provided, a CloudFormation Output is created for the `CanonicalUser` to grant `s3:GetObject` permissions to.
   * If not provided, a CloudFormation Output of the bucket name is created.
   *
   * @see https://github.com/awsdocs/amazon-s3-userguide/blob/d9fa2605ba253b3ca6ca1a83da5fa6b0b9b6debb/doc_source/s3-bucket-user-policy-specifying-principal-intro.md
   *
   */
  preExistingOriginBucketName?: string;

  /**
   * Behaviours of the S3 bucket origin.
   *
   * Defaults to compress responses and redirect http to https.
   */
  behaviours?: Behavior[];

  /**
   * Flag to opt-out of automatically creating a [[ `GuCname` ]]. You'll have to create it yourself.
   * This is useful if you want to control the TTL, which defaults to 1 hour.
   */
  withoutDns?: boolean;
}

/**
 * A construct to create a static site with an S3 bucket origin and a CloudFront distribution.
 * A CNAME DNS record is also created.
 *
 * Expects a single S3 bucket to be shared by all stages. If your app is called `my-static-site`, the bucket should have the following layout:
 *
 * ```
 * .
 * ├── CODE
 * │    └── my-static-site
 * │        └── index.html
 * └── PROD
 *     └── my-static-site
 *         └── index.html
 * ```
 *
 * Or, more generally:
 *
 * ```
 * .
 * └── <STAGE>
 *     └── <APP>
 *         └── index.html
 * ```
 *
 * Example usage, creating a new bucket:
 *
 * ```typescript
 * new GuStaticSite(scope, "StaticSite", {
 *   app: "my-static-site",
 *   domainNameProps: {
 *     CODE: {
 *       domainName: "my-static-site.code.domain.co.uk",
 *     },
 *     PROD: {
 *       domainName: "my-static-site.prod.domain.co.uk",
 *     },
 *   },
 * });
 * ```
 *
 * Example usage, using a pre-existing bucket and certificate:
 *
 * ```typescript
 * new GuStaticSite(scope, "StaticSite", {
 *   app: "my-static-site",
 *   domainNameProps: {
 *     CODE: {
 *       domainName: "my-static-site.code.domain.co.uk",
 *     },
 *     PROD: {
 *       domainName: "my-static-site.prod.domain.co.uk",
 *     },
 *   },
 *   originBucketName: "my-static-site-origin",
 *   certificateArn: {
 *     CODE: `arn:aws:acm:us-east-1:${scope.account}:certificate/abcde-01234-fghij-56789`,
 *     PROD: `arn:aws:acm:us-east-1:${scope.account}:certificate/01234-abcde-56789-fghij`,
 *   }
 * });
 */
export class GuStaticSite extends GuAppAwareConstruct(CloudFrontWebDistribution) {
  /*
   Validate an ACM ARN and return the resource name for later use in a CFN Mapping.
   This is because a CFN Mapping cannot include the `AccountId` pseudo function.

   @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html#cfn-pseudo-param-accountid
   @see https://docs.aws.amazon.com/cdk/v2/guide/tokens.html
    */
  private static getResourceNameFromArn(certificateArn: string): string {
    const { account, region, resource, resourceName } = Arn.split(certificateArn, ArnFormat.SLASH_RESOURCE_NAME);

    if (!Token.isUnresolved(account)) {
      throw new Error(
        "Account numbers are considered private information and should not be added to VCS. Use the `account` property on `GuStack` instead."
      );
    }

    if (region !== GLOBAL_AWS_REGION) {
      throw new Error(CLOUDFRONT_CERTIFICATE_REQUIREMENT_MESSAGE);
    }

    if (resource !== ACM_ARN_RESOURCE || !resourceName) {
      throw new Error("Invalid ARN for an ACM resource.");
    }

    return resourceName;
  }

  /*
  CloudFront requires an ACM certificate from us-east-1 (the "global" region).
  If a certificateArn has been provided in the props, validate it is from the global region, or throw.
  Else, create a new certificate and show a reminder to deploy the template in the global region.

  Once https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/523 ships, this dance should no longer be necessary.
   */
  private static getCertificate(
    scope: GuStack,
    { app, domainNameProps, preExistingCertificateArn }: GuStaticSiteProps
  ) {
    if (!preExistingCertificateArn) {
      Annotations.of(scope).addInfo(
        `Deploy this template in the ${GLOBAL_AWS_REGION} region as ${CLOUDFRONT_CERTIFICATE_REQUIREMENT_MESSAGE}`
      );

      return new GuCertificate(scope, {
        app,
        ...domainNameProps,
      });
    }

    const resourceName = StageAwareValue.isStageValue(preExistingCertificateArn)
      ? scope.withStageDependentValue({
          app,
          variableName: "certificateResourceName",
          stageValues: {
            [Stage.CODE]: GuStaticSite.getResourceNameFromArn(preExistingCertificateArn.CODE),
            [Stage.PROD]: GuStaticSite.getResourceNameFromArn(preExistingCertificateArn.PROD),
          },
        })
      : GuStaticSite.getResourceNameFromArn(preExistingCertificateArn.INFRA);

    return Certificate.fromCertificateArn(
      scope,
      AppIdentity.suffixText({ app }, "Certificate"),
      Arn.format({
        partition: "aws",
        service: "acm",
        region: GLOBAL_AWS_REGION,
        account: scope.account,
        resource: ACM_ARN_RESOURCE,
        resourceName,
        arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
      })
    );
  }

  private static getBucket(
    scope: GuStack,
    { app, preExistingOriginBucketName }: GuStaticSiteProps,
    { cloudFrontOriginAccessIdentityS3CanonicalUserId }: OriginAccessIdentity
  ) {
    const bucket = preExistingOriginBucketName
      ? Bucket.fromBucketName(scope, AppIdentity.suffixText({ app }, "OriginBucket"), preExistingOriginBucketName)
      : new GuS3Bucket(scope, "OriginBucket", { app });

    if (preExistingOriginBucketName) {
      /*
      We can only update a bucket's policy if the bucket is created in the same stack.
      If the bucket has been created externally, produce a CloudFormation Output to ease.

      @see https://github.com/awsdocs/amazon-s3-userguide/blob/d9fa2605ba253b3ca6ca1a83da5fa6b0b9b6debb/doc_source/s3-bucket-user-policy-specifying-principal-intro.md
       */
      new CfnOutput(scope, AppIdentity.suffixText({ app }, "CloudFrontOAI"), {
        description: `Canonical user ID used by CloudFront distribution. This should be granted 's3:GetObject' access to S3 bucket '${preExistingOriginBucketName}'.`,
        value: cloudFrontOriginAccessIdentityS3CanonicalUserId,
      });
      Annotations.of(scope).addWarning(
        `Origin bucket not managed by this stack. Grant 's3:GetObject' permission on ${preExistingOriginBucketName} to the principal listed as an Output on this stack. See https://github.com/awsdocs/amazon-s3-userguide/blob/d9fa2605ba253b3ca6ca1a83da5fa6b0b9b6debb/doc_source/s3-bucket-user-policy-specifying-principal-intro.md.`
      );
    } else {
      bucket.addToResourcePolicy(
        new PolicyStatement({
          actions: ["s3:GetObject"],
          resources: [bucket.arnForObjects(`${scope.stage}/${app}/*`)],
          principals: [new CanonicalUserPrincipal(cloudFrontOriginAccessIdentityS3CanonicalUserId)],
        })
      );

      new CfnOutput(scope, AppIdentity.suffixText({ app }, "OriginBucketName"), {
        description: "S3 bucket origin for CloudFront.",
        value: bucket.bucketName,
      });
    }

    return bucket;
  }

  constructor(scope: GuStack, id: string, props: GuStaticSiteProps) {
    const {
      app,
      domainNameProps,
      behaviours = [
        {
          compress: true,
          isDefaultBehavior: true,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      ],
      withoutDns = false,
    } = props;
    const { stage } = scope;

    const certificate = GuStaticSite.getCertificate(scope, props);

    const domainName = StageAwareValue.isStageValue(domainNameProps)
      ? scope.withStageDependentValue({
          app,
          variableName: GuCertificate.mappingVariableName,
          stageValues: {
            [Stage.CODE]: domainNameProps.CODE.domainName,
            [Stage.PROD]: domainNameProps.PROD.domainName,
          },
        })
      : domainNameProps.INFRA.domainName;

    const viewerCertificate = ViewerCertificate.fromAcmCertificate(certificate, {
      aliases: [domainName],
    });

    const originAccessIdentity = new OriginAccessIdentity(
      scope,
      AppIdentity.suffixText({ app }, "CloudFrontOriginAccessIdentity"),
      {
        comment: `Origin Access Identity for ${app} ${stage}`,
      }
    );

    const s3Bucket = GuStaticSite.getBucket(scope, props, originAccessIdentity);

    super(scope, id, {
      ...props,
      comment: `CloudFront distribution for ${app} ${stage}`,
      viewerCertificate,
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: s3Bucket,
            originAccessIdentity,
            originPath: `/${stage}/${app}`,
          },
          behaviors: behaviours,
        },
      ],
    });

    if (!withoutDns) {
      new GuCname(scope, AppIdentity.suffixText({ app }, "DnsRecord"), {
        app,
        domainNameProps,
        resourceRecord: this.distributionDomainName,
        ttl: Duration.hours(1),
      });
    }
  }
}
