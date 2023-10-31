import type {NoMonitoring} from "../constructs/cloudwatch";
import type {GuStack} from "../constructs/core";
import type {GuFunctionProps} from "../constructs/lambda";
import {GuLambdaFunction} from "../constructs/lambda";
import {
  GuApplicationLoadBalancer,
  GuApplicationTargetGroup,
  GuHttpsApplicationListener
} from "../constructs/loadbalancing";
import {AccessScope} from "../constants";
import {AccessLoggingProps, Alarms} from "./ec2-app";
import {LambdaTarget} from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import {GuCertificate} from "../constructs/acm";
import type {GuDomainName} from "../types";
import {GuLoadBalancingComponents} from "./load-balancer/load-balancer";

export interface GuAlbLambdaProps extends Omit<GuFunctionProps, "errorPercentageMonitoring"> {
  /**
   * Alarm configuration for your API. For more details, see [[`ApiGatewayAlarms`]].
   *
   * If your team do not use CloudWatch, it's possible to opt-out with the following configuration:
   * ```typescript
   *  monitoringConfiguration: { noMonitoring: true }
   * ```
   */
  monitoringConfiguration: Alarms | NoMonitoring;

  accessLogging?: AccessLoggingProps;

  certificateProps?: GuDomainName;
}

interface GuAlbLambdaPropsTarget extends GuAlbLambdaProps {
  // target: IApplicationLoadBalancerTarget;

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
export class GuAlbLambda extends GuLambdaFunction {
  public readonly certificate?: GuCertificate;
  public readonly loadBalancer: GuApplicationLoadBalancer;
  public readonly listener: GuHttpsApplicationListener;
  public readonly targetGroup: GuApplicationTargetGroup;

  constructor(scope: GuStack, id: string, props: GuAlbLambdaPropsTarget) {
    super(scope, id, {
      ...props,
    });

    if (!props.vpc) {
      throw new Error("VPC must be defined for ALB lambdas")
    }

    const targetGroup = new GuApplicationTargetGroup(scope, "TargetGroup", {
      app: props.app,
      vpc: props.vpc,
      targets: [new LambdaTarget(this)]
    })


    const loadBalancer = new GuLoadBalancingComponents(scope, {
      ...props,
      access: { scope: AccessScope.PUBLIC },
      targetGroup: targetGroup
    })

    this.certificate = loadBalancer.certificate;
    this.loadBalancer = loadBalancer.loadBalancer;
    this.listener = loadBalancer.listener;
    this.targetGroup = loadBalancer.targetGroup;
  }
}
