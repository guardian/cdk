import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import type { LambdaRestApiProps } from "aws-cdk-lib/aws-apigateway";
import type { NoMonitoring } from "../constructs/cloudwatch";
import { GuApiGateway5xxPercentageAlarm } from "../constructs/cloudwatch/api-gateway-alarms";
import type { GuStack } from "../constructs/core";
import { GuLambdaFunction } from "../constructs/lambda";
import type { GuFunctionProps } from "../constructs/lambda";
import type { ApiGatewayAlarms } from "./api-multiple-lambdas";
import {
  GuApplicationLoadBalancer,
  GuApplicationTargetGroup,
  GuHttpsApplicationListener
} from "../constructs/loadbalancing";
import {NAMED_SSM_PARAMETER_PATHS} from "../constants";
import {AppIdentity, GuStringParameter} from "../constructs/core";
import {Bucket} from "aws-cdk-lib/aws-s3";
import {ApplicationProtocol} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import {GuVpc, SubnetType} from "../constructs/ec2";
import {AccessLoggingProps} from "./ec2-app";
import {LambdaTarget} from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import {GuCertificate} from "../constructs/acm";
import {GuDomainName} from "../../lib/types";

interface ApiProps extends Omit<LambdaRestApiProps, "handler"> {
  id: string;
}

enum HTTPInterface {
  API_GATEWAY = "ApiGateway",
  ALB = "ALB"
}

export interface GuApiLambdaProps extends Omit<GuFunctionProps, "errorPercentageMonitoring"> {
  /**
   * [[`LambdaRestApiProps`]] to configure for the lambda.
   */
  api: ApiProps;
  /**
   * Alarm configuration for your API. For more details, see [[`ApiGatewayAlarms`]].
   *
   * If your team do not use CloudWatch, it's possible to opt-out with the following configuration:
   * ```typescript
   *  monitoringConfiguration: { noMonitoring: true }
   * ```
   */
  monitoringConfiguration: NoMonitoring | ApiGatewayAlarms;

  httpInterface?: HTTPInterface

  accessLogging?: AccessLoggingProps;

  certificateProps?: GuDomainName;
}

/**
 * A pattern to create a Lambda triggered by API Gateway
 * @see https://docs.aws.amazon.com/apigateway/latest/developerguide/getting-started-with-lambda-integration.html
 *
 * This pattern should be used if you intend to serve all traffic via a single Lambda
 * (for example, if your Lambda uses an application framework, like https://github.com/vendia/serverless-express).
 * If you need to configure path-based routing to serve different requests with different
 * Lambdas, use the [[`GuApiGatewayWithLambdaByPath`]] pattern instead.
 *
 * For all configuration options, see [[`GuApiLambdaProps`]].
 *
 * Example usage:
 *
 * ```typescript
 * new GuApiLambda(stack, "my-lambda", {
 *   fileName: "my-app.zip",
 *   handler: "handler.ts",
 *   runtime: Runtime.NODEJS_14_X,
 *   monitoringConfiguration: {
 *     http5xxAlarm: { tolerated5xxPercentage: 5 },
 *     snsTopicName: "alerts-topic",
 *   },
 *   app: "my-app",
 *   api: {
 *     id: "my-api",
 *     description: "...",
 *   },
 * });
 * ```
 */
export class GuApiLambda extends GuLambdaFunction {
  public readonly api: LambdaRestApi;

  constructor(scope: GuStack, id: string, props: GuApiLambdaProps) {
    super(scope, id, {
      ...props,
    });

    // If we have an alias, use this to ensure that all requests are routed to a published Lambda version.
    // Otherwise, use the latest unpublished version ($LATEST)
    const resourceToInvoke = this.alias ?? this;

    if(props.httpInterface === HTTPInterface.ALB) {
      if(!props.vpc) {
        throw new Error("VPC must be defined for ALB lambdas")
      }
      const loadBalancer = new GuApplicationLoadBalancer(scope, "LoadBalancer", {
        app: props.app,
        vpc: props.vpc,
        internetFacing: true,
        vpcSubnets: {
          subnets: GuVpc.subnetsFromParameter(scope, { type: SubnetType.PUBLIC, app: props.app }),
        },
      });

      if (props.accessLogging?.enabled) {
        const accessLoggingBucket = new GuStringParameter(scope, "AccessLoggingBucket", {
          description: NAMED_SSM_PARAMETER_PATHS.AccessLoggingBucket.description,
          default: NAMED_SSM_PARAMETER_PATHS.AccessLoggingBucket.path,
          fromSSM: true,
        });

        loadBalancer.logAccessLogs(
          Bucket.fromBucketName(
            scope,
            AppIdentity.suffixText(props, "AccessLoggingBucket"),
            accessLoggingBucket.valueAsString
          ),
          props.accessLogging.prefix
        );
      }

      const targetGroup = new GuApplicationTargetGroup(scope, "TargetGroup", {
        app: props.app,
        vpc: props.vpc,
        protocol: ApplicationProtocol.HTTP,
        targets: [new LambdaTarget(this)],
        healthCheck: {
          enabled: true
        }
      });

      const certificate =
        typeof props.certificateProps !== "undefined"
          ? new GuCertificate(scope, {
            app: props.app,
            domainName: props.certificateProps.domainName,
            hostedZoneId: props.certificateProps.hostedZoneId,
          })
          : undefined;

      const listener = new GuHttpsApplicationListener(scope, "Listener", {
        app: props.app,
        loadBalancer,
        certificate,
        targetGroup,
        // When open=true, AWS will create a security group which allows all inbound traffic over HTTPS
        open: true,
      });
    } else {
        this.api = new LambdaRestApi(this, props.api.id, {
          handler: resourceToInvoke,

          // Override to avoid clashes as default is just api ID, which is often shared across stages.
          restApiName: `${scope.stack}-${scope.stage}-${props.api.id}`,

          ...props.api,
        });
    }

    if (!props.monitoringConfiguration.noMonitoring) {
      new GuApiGateway5xxPercentageAlarm(scope, {
        app: props.app,
        apiGatewayInstance: this.api,
        snsTopicName: props.monitoringConfiguration.snsTopicName,
        ...props.monitoringConfiguration.http5xxAlarm,
      });
    }
  }
}
