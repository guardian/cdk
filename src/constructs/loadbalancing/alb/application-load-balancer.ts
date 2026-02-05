import { Annotations, CfnOutput } from "aws-cdk-lib";
import { ApplicationLoadBalancer } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import type { ApplicationLoadBalancerProps, CfnLoadBalancer } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ParameterDataType, ParameterTier, StringParameter } from "aws-cdk-lib/aws-ssm";
import { GuAppAwareConstruct } from "../../../utils/mixin/app-aware-construct";
import type { GuStack } from "../../core";
import { AppIdentity, GuAccessLoggingBucketParameter } from "../../core";

/**
 * Adds the following headers to each request before forwarding it to the target:
 *  - `x-amzn-tls-version`, which has information about the TLS protocol version negotiated with the client
 *  - `x-amzn-tls-cipher-suite`, which has information about the cipher suite negotiated with the client
 *
 * Both headers are in OpenSSL format.
 */
export const TLS_VERSION_AND_CIPHER_SUITE_HEADERS_ENABLED = "routing.http.x_amzn_tls_version_and_cipher_suite.enabled";

/**
 * Indicates whether HTTP headers with invalid header fields are removed by the load balancer.
 * Invalid headers are described as HTTP header names that do not conform to the regular expression [-A-Za-z0-9]+
 */
export const DROP_INVALID_HEADER_FIELDS_ENABLED = "routing.http.drop_invalid_header_fields.enabled";

interface GuApplicationLoadBalancerProps extends ApplicationLoadBalancerProps, AppIdentity {
  /**
   * If your CloudFormation does not define the Type of your Load Balancer, you must set this boolean to true to avoid
   * resource [replacement](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-loadbalancer.html#cfn-elasticloadbalancingv2-loadbalancer-type).
   * If a Load Balancer is replaced it is likely to lead to downtime.
   */
  removeType?: boolean;

  /**
   * Enable access logging for this load balancer.
   * Access logs are written to an S3 bucket within your AWS account.
   * The bucket is created by {@link https://github.com/guardian/aws-account-setup}.
   * The logs are queryable via the `gucdk_access_logs` Athena database.
   *
   * @default true
   */
  withAccessLogging?: boolean;

  /**
   * Configuration for WAF protection, if desired
   */
  waf?: WafProps;
}

/**
 * Construct which creates an Application Load Balancer.
 *
 * This construct should be used in conjunction with [[`GuApplicationListener`]] and [[`GuApplicationTargetGroup`]]
 * to route traffic to your application. For more details on these three components, see the
 * [AWS documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html#application-load-balancer-components).
 *
 * This resource is stateful.
 * @see https://github.com/guardian/cdk/blob/main/docs/stateful-resources.md
 */
export class GuApplicationLoadBalancer extends GuAppAwareConstruct(ApplicationLoadBalancer) {
  public readonly waf?: StringParameter;

  constructor(scope: GuStack, id: string, props: GuApplicationLoadBalancerProps) {
    const { app, removeType, waf, withAccessLogging = true } = props;
    const { stack, stage } = scope;

    super(scope, id, { deletionProtection: true, ...props });

    this.setAttribute(TLS_VERSION_AND_CIPHER_SUITE_HEADERS_ENABLED, "true");
    this.setAttribute(DROP_INVALID_HEADER_FIELDS_ENABLED, "true");

    if (removeType) {
      const cfnLb = this.node.defaultChild as CfnLoadBalancer;
      cfnLb.addPropertyDeletionOverride("Type");
    }

    if (withAccessLogging) {
      const bucket = Bucket.fromBucketName(
        scope,
        AppIdentity.suffixText(props, "AccessLoggingBucket"),
        GuAccessLoggingBucketParameter.getInstance(scope).valueAsString,
      );
      const prefix = `application-load-balancer/${stage}/${stack}/${app}`;
      this.logAccessLogs(bucket, prefix);
    } else {
      this.setAttribute("access_logs.s3.enabled", "false");
      Annotations.of(this).addInfo(`Access logs disabled for load balancer`);
    }

    new CfnOutput(this, `${this.idWithApp}-DnsName`, {
      description: `DNS entry for ${this.idWithApp}`,
      value: this.loadBalancerDnsName,
    }).overrideLogicalId(`${this.idWithApp}DnsName`);

    if (!!waf && waf.enabled) {
      this.waf = new StringParameter(this, "AlbSsmParam", {
        parameterName: `/infosec/waf/services/${stage}/${app}-alb-arn`,
        description: `The ARN of the ALB for ${stage}-${app}.`,
        simpleName: false,
        stringValue: this.loadBalancerArn,
        tier: ParameterTier.STANDARD,
        dataType: ParameterDataType.TEXT,
      });
    }
  }
}

export interface WafProps {
  enabled: boolean;
}
