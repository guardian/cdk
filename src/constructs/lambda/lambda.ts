import type { LambdaRestApiProps } from "@aws-cdk/aws-apigateway";
import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import type { Schedule } from "@aws-cdk/aws-events";
import { Rule } from "@aws-cdk/aws-events";
import { LambdaFunction } from "@aws-cdk/aws-events-targets";
import { Code, Function, RuntimeFamily } from "@aws-cdk/aws-lambda";
import type { FunctionProps, Runtime } from "@aws-cdk/aws-lambda";
import { Bucket } from "@aws-cdk/aws-s3";
import { Duration } from "@aws-cdk/core";
import { GuDistributable } from "../../types/distributable";
import type { GuLambdaErrorPercentageMonitoringProps } from "../cloudwatch";
import { GuLambdaErrorPercentageAlarm } from "../cloudwatch";
import type { GuStack } from "../core";
import { GuDistributionBucketParameter } from "../core";
import { AppIdentity } from "../core/identity";

interface ApiProps extends Omit<LambdaRestApiProps, "handler"> {
  id: string;
}

export interface GuFunctionProps extends GuDistributable, Omit<FunctionProps, "code">, AppIdentity {
  rules?: Array<{
    schedule: Schedule;
    description?: string;
  }>;
  apis?: ApiProps[];
  errorPercentageMonitoring?: GuLambdaErrorPercentageMonitoringProps;
}

function defaultMemorySize(runtime: Runtime, memorySize?: number): number {
  if (memorySize) {
    return memorySize;
  } else {
    switch (runtime.family) {
      case RuntimeFamily.JAVA:
        return 1024;
      default:
        return 512;
    }
  }
}

export class GuLambdaFunction extends Function {
  constructor(scope: GuStack, id: string, props: GuFunctionProps) {
    const { app, fileName, runtime, memorySize, timeout } = props;

    const bucket = Bucket.fromBucketName(
      scope,
      `${id}-bucket`,
      GuDistributionBucketParameter.getInstance(scope).valueAsString
    );
    const objectKey = GuDistributable.getObjectKey(scope, { app }, { fileName });
    const code = Code.fromBucket(bucket, objectKey);
    super(scope, id, {
      ...props,
      memorySize: defaultMemorySize(runtime, memorySize),
      timeout: timeout ?? Duration.seconds(30),
      code,
    });

    props.rules?.forEach((rule, index) => {
      const target = new LambdaFunction(this);
      new Rule(this, `${id}-${rule.schedule.expressionString}-${index}`, {
        schedule: rule.schedule,
        targets: [target],
        ...(rule.description && { description: rule.description }),
        enabled: true,
      });
    });

    props.apis?.forEach((api) => {
      new LambdaRestApi(this, api.id, {
        handler: this,
        ...api,
      });
    });

    if (props.errorPercentageMonitoring) {
      new GuLambdaErrorPercentageAlarm(scope, "ErrorPercentageAlarmForLambda", {
        ...props.errorPercentageMonitoring,
        lambda: this,
      });
    }

    bucket.grantRead(this);

    AppIdentity.taggedConstruct(props, this);
  }
}
