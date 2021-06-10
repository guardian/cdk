import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import type { LambdaRestApiProps } from "@aws-cdk/aws-apigateway";
import type { GuLambdaErrorPercentageMonitoringProps, NoMonitoring } from "../constructs/cloudwatch";
import type { GuStack } from "../constructs/core";
import { GuLambdaFunction } from "../constructs/lambda";
import type { GuFunctionProps } from "../constructs/lambda";

interface ApiProps extends Omit<LambdaRestApiProps, "handler"> {
  id: string;
}

interface GuApiLambdaProps extends Omit<GuFunctionProps, "errorPercentageMonitoring"> {
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
 * A pattern to create a lambda triggered by API Gateway
 * @see https://docs.aws.amazon.com/apigateway/latest/developerguide/getting-started-with-lambda-integration.html
 */
export class GuApiLambda extends GuLambdaFunction {
  constructor(scope: GuStack, id: string, props: GuApiLambdaProps) {
    super(scope, id, {
      ...props,
      errorPercentageMonitoring: props.monitoringConfiguration.noMonitoring ? undefined : props.monitoringConfiguration,
    });

    props.apis.forEach((api) => {
      new LambdaRestApi(this, api.id, {
        handler: this,
        ...api,
      });
    });
  }
}
