import type { RestApiProps } from "aws-cdk-lib/aws-apigateway";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import type { Http5xxAlarmProps, NoMonitoring } from "../constructs/cloudwatch";
import { GuApiGateway5xxPercentageAlarm } from "../constructs/cloudwatch/api-gateway-alarms";
import type { AppIdentity, GuStack } from "../constructs/core";
import type { GuLambdaFunction } from "../constructs/lambda";

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
export type HttpMethod = "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE" | "PATCH";

export interface ApiTarget {
  /**
   * The path for the request (e.g. /test).
   */
  path: string;
  /**
   * The [[`HttpMethod`]] for the target (e.g. GET, POST, PUT).
   */
  httpMethod: HttpMethod;
  /**
   * The Lambda function responsible for handling the request.
   */
  lambda: GuLambdaFunction;
}

/**
 * Configuration for an alarm based on the percentage of 5XX responses served by the API Gateway instance.
 *
 * For example:
 *
 * ```typescript
 * monitoringConfiguration: {
 *   snsTopicName: "my-topic-for-cloudwatch-alerts",
 *   http5xxAlarm: {
 *     tolerated5xxPercentage: <sensible_error_percentage_threshold>,
 *   }
 * }
 * ```
 */
export interface ApiGatewayAlarms {
  snsTopicName: string;
  http5xxAlarm: Http5xxAlarmProps;
  noMonitoring?: false;
}

export interface GuApiGatewayWithLambdaByPathProps extends RestApiProps, AppIdentity {
  /**
   * A list of [[`ApiTarget`]]s to configure for the API Gateway instance.
   */
  targets: ApiTarget[];
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

function isNoMonitoring(
  monitoringConfiguration: NoMonitoring | ApiGatewayAlarms
): monitoringConfiguration is NoMonitoring {
  return (<NoMonitoring>monitoringConfiguration).noMonitoring;
}

/**
 * A pattern to create an API Gateway instance which uses path-based routing to route requests
 * to two or more Lambda functions.
 *
 * This pattern should be used if you need to configure path-based routing to serve different
 * requests with different Lambdas. If you intend to serve all traffic via a single Lambda, use
 * the [[`GuApiLambda`]] pattern instead.
 *
 * Example usage:
 *
 * ```typescript
 * // Configure lambdas
 * const lambdaOne = new GuLambdaFunction(this, "lambda-one", {
 *   app: "example-lambda-one",
 *   runtime: Runtime.NODEJS_14_X,
 *   handler: "lambda-one.handler",
 *   fileName: "lambda-one.zip",
 * });
 * const lambdaTwo = new GuLambdaFunction(this, "lambda-two", {
 *   app: "example-lambda-two",
 *   runtime: Runtime.NODEJS_14_X,
 *   handler: "lambda-two.handler",
 *   fileName: "lambda-two.zip",
 * });
 *
 * // Wire up the API
 * new GuApiGatewayWithLambdaByPath(this, {
 *   app: "example-api-gateway-instance",
 *   targets: [
 *     {
 *       path: "lambda-one",
 *       httpMethod: "GET",
 *       lambda: lambdaOne,
 *     },
 *     {
 *       path: "lambda-two",
 *       httpMethod: "GET",
 *       lambda: lambdaTwo,
 *     },
 *   ],
 *   // Create an alarm
 *   monitoringConfiguration: {
 *     snsTopicName: "my-topic-for-cloudwatch-alerts",
 *     http5xxAlarm: {
 *       tolerated5xxPercentage: 1,
 *     }
 *   }
 * });
 * ```
 *
 * For all API configuration options, see [[`GuApiGatewayWithLambdaByPathProps`]].
 *
 * For details on configuring the individual Lambda functions, see [[`GuLambdaFunction`]].
 */
export class GuApiGatewayWithLambdaByPath extends Construct {
  public readonly api: RestApi;

  constructor(scope: GuStack, props: GuApiGatewayWithLambdaByPathProps) {
    super(scope, props.app); // The assumption is `app` is unique
    const apiGateway = new RestApi(scope, "RestApi", {
      // Override to avoid clashes as default is just api ID, which is often shared across stages.
      restApiName: `${scope.stack}-${scope.stage}-${props.app}`,
      ...props,
    });

    this.api = apiGateway;
    props.targets.map((target) => {
      const resource = apiGateway.root.resourceForPath(target.path);
      resource.addMethod(target.httpMethod, new LambdaIntegration(target.lambda));
    });
    if (!isNoMonitoring(props.monitoringConfiguration)) {
      new GuApiGateway5xxPercentageAlarm(scope, {
        app: props.app,
        apiGatewayInstance: apiGateway,
        snsTopicName: props.monitoringConfiguration.snsTopicName,
        ...props.monitoringConfiguration.http5xxAlarm,
      });
    }
  }
}
