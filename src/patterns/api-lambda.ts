import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import type { LambdaRestApiProps } from "aws-cdk-lib/aws-apigateway";
import type { GuLambdaErrorPercentageMonitoringProps, NoMonitoring } from "../constructs/cloudwatch";
import type { GuStack } from "../constructs/core";
import { GuLambdaFunction } from "../constructs/lambda";
import type { GuFunctionProps } from "../constructs/lambda";

interface ApiProps extends Omit<LambdaRestApiProps, "handler"> {
  id: string;
}

export interface GuApiLambdaProps extends Omit<GuFunctionProps, "errorPercentageMonitoring"> {
  /**
   * A list of [[`LambdaRestApiProps`]] to configure for the lambda.
   */
  apis: ApiProps[];

  /**
   * Configuration for an alarm based on the lambda's error percentage.
   *
   * For example:
   *
   * ```typescript
   * monitoringConfiguration: {
   *   toleratedErrorPercentage: <sensible_error_percentage_threshold>,
   *   snsTopicName: "my-topic-for-cloudwatch-alerts",
   * }
   * ```
   *
   * If your team do not use CloudWatch, it's possible to opt-out with the following configuration:
   * ```typescript
   *  monitoringConfiguration: { noMonitoring: true }
   * ```
   */
  monitoringConfiguration: NoMonitoring | GuLambdaErrorPercentageMonitoringProps;
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
 */
export class GuApiLambda extends GuLambdaFunction {
  public readonly apis: Map<string, LambdaRestApi>;

  constructor(scope: GuStack, id: string, props: GuApiLambdaProps) {
    super(scope, id, {
      ...props,
      errorPercentageMonitoring: props.monitoringConfiguration.noMonitoring ? undefined : props.monitoringConfiguration,
    });

    this.apis = new Map<string, LambdaRestApi>();

    for (const api of props.apis) {
      this.apis.set(
        api.id,
        new LambdaRestApi(this, api.id, {
          handler: this,
          ...api,
        })
      );
    }
  }
}
