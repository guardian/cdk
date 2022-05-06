import type { RestApiProps } from "aws-cdk-lib/aws-apigateway";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import type { Http5xxAlarmProps, NoMonitoring } from "../constructs/cloudwatch";
import { GuApiGateway5xxPercentageAlarm } from "../constructs/cloudwatch/api-gateway-alarms";
import type { AppIdentity, GuStack } from "../constructs/core";
import type { GuLambdaFunction } from "../constructs/lambda";

interface ApiTarget {
  path: string;
  httpMethod: string;
  lambda: GuLambdaFunction;
}

export interface Alarms {
  snsTopicName: string;
  http5xxAlarm: Http5xxAlarmProps;
  noMonitoring?: false;
}

interface GuApiMultipleLambdasProps extends RestApiProps, AppIdentity {
  targets: ApiTarget[];
  monitoringConfiguration: NoMonitoring | Alarms;
}

function isNoMonitoring(monitoringConfiguration: NoMonitoring | Alarms): monitoringConfiguration is NoMonitoring {
  return (<NoMonitoring>monitoringConfiguration).noMonitoring;
}

/**
 * A pattern to create an API Gateway instance which uses path-based routing to route requests
 * to several Lambda functions.
 */
export class GuApiMultipleLambdas {
  constructor(scope: GuStack, props: GuApiMultipleLambdasProps) {
    const apiGateway = new RestApi(scope, "RestApi", props);
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
