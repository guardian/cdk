import type {NoMonitoring} from "../../constructs/cloudwatch";
import type {GuStack} from "../../constructs/core";
import type {GuFunctionProps} from "../../constructs/lambda";
import {GuLambdaFunction} from "../../constructs/lambda";
import {
  GuApplicationLoadBalancer,
  GuApplicationTargetGroup,
  GuHttpsApplicationListener
} from "../../constructs/loadbalancing";
import {AccessScope} from "../../constants";
import {AccessLoggingProps, Alarms} from "../../patterns/ec2-app";
import {LambdaTarget} from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import {GuCertificate} from "../../constructs/acm";
import type {GuDomainName} from "../../types";
import {GuLoadBalancingComponents} from "../../patterns/load-balancer/load-balancer";

export interface GuAlbLambdaProps extends Omit<GuFunctionProps, "errorPercentageMonitoring"> {
  /**
   *
   * Enable and configure alarms.
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

/**
 * A pattern to create a Lambda triggered by a load balancer
 * @see ttps://docs.aws.amazon.com/lambda/latest/dg/services-alb.html
 *
 * This pattern should be used if you intend to serve all traffic via a single Lambda
 * (for example, if your Lambda uses an application framework, like https://github.com/vendia/serverless-express).
 *
 * For all configuration options, see [[`GuAlbLambdaProps`]].
 *
 * Example usage:
 *
 * ```typescript
 * new GuAlbLambda(stack, "lambda", {
 *       fileName: "my-app.zip",
 *       handler: "handler.ts",
 *       runtime: Runtime.NODEJS_12_X,
 *       monitoringConfiguration: noMonitoring,
 *       app: "testing",
 *       vpc: vpc,
 *       vpcSubnets: {
 *         subnets: vpc.privateSubnets
 *       }
 *     });
 * ```
 */
export class GuAlbLambda extends GuLambdaFunction {
  public readonly certificate?: GuCertificate;
  public readonly loadBalancer: GuApplicationLoadBalancer;
  public readonly listener: GuHttpsApplicationListener;
  public readonly targetGroup: GuApplicationTargetGroup;

  constructor(scope: GuStack, id: string, props: GuAlbLambdaProps) {
    super(scope, id, {
      ...props,
    });

    if (!props.vpc) {
      throw new Error("VPC must be defined for ALB lambdas")
    }

    const targetGroup = new GuApplicationTargetGroup(scope, "TargetGroup", {
      targetGroupType: "lambda",
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
