import type { LambdaRestApiProps } from "@aws-cdk/aws-apigateway";
import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import type { GuLambdaErrorPercentageMonitoringProps, NoMonitoring } from "../constructs/cloudwatch";
import type { GuStack } from "../constructs/core";
import type { GuFunctionProps } from "../constructs/lambda";
import { GuLambdaFunction } from "../constructs/lambda";

interface ApiProps extends Omit<LambdaRestApiProps, "handler"> {
  id: string;
}

interface GuApiLambdaProps extends Omit<GuFunctionProps, "errorPercentageMonitoring"> {
  apis: ApiProps[];
  monitoringConfiguration: NoMonitoring | GuLambdaErrorPercentageMonitoringProps;
}

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
