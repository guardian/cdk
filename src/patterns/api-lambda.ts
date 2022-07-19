import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import type { LambdaRestApiProps } from "aws-cdk-lib/aws-apigateway";
import type { GuConstruct } from "../aspects/metadata";
import type { NoMonitoring } from "../constructs/cloudwatch";
import { GuApiGateway5xxPercentageAlarm } from "../constructs/cloudwatch/api-gateway-alarms";
import type { GuStack } from "../constructs/core";
import { GuLambdaFunction } from "../constructs/lambda";
import type { GuFunctionProps } from "../constructs/lambda";
import type { ApiGatewayAlarms } from "./api-multiple-lambdas";

interface ApiProps extends Omit<LambdaRestApiProps, "handler"> {
  id: string;
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
export class GuApiLambda extends GuLambdaFunction implements GuConstruct {
  public readonly api: LambdaRestApi;
  readonly guConstructID = "GuApiLambda";

  constructor(scope: GuStack, id: string, props: GuApiLambdaProps) {
    super(scope, id, {
      ...props,
    });

    this.api = new LambdaRestApi(this, props.api.id, {
      handler: this,

      // Override to avoid clashes as default is just api ID, which is often shared across stages.
      restApiName: `${scope.stack}-${scope.stage}-${props.api.id}`,

      ...props.api,
    });

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
