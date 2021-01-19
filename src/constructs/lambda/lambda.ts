import type { LambdaRestApiProps } from "@aws-cdk/aws-apigateway";
import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import type { Schedule } from "@aws-cdk/aws-events";
import { Rule } from "@aws-cdk/aws-events";
import { LambdaFunction } from "@aws-cdk/aws-events-targets";
import { Code, Function } from "@aws-cdk/aws-lambda";
import type { FunctionProps } from "@aws-cdk/aws-lambda";
import { Bucket } from "@aws-cdk/aws-s3";
import type { GuStack } from "../core";

interface ApiProps extends Omit<LambdaRestApiProps, "handler"> {
  id: string;
}

export interface GuFunctionProps extends Omit<FunctionProps, "code"> {
  code: { bucket: string; key: string };
  rules?: Array<{
    schedule: Schedule;
    description?: string;
  }>;
  apis?: ApiProps[];
}

export class GuLambdaFunction extends Function {
  constructor(scope: GuStack, id: string, props: GuFunctionProps) {
    const bucket = Bucket.fromBucketName(scope, `${id}-bucket`, props.code.bucket);
    const code = Code.fromBucket(bucket, props.code.key);
    super(scope, id, {
      ...props,
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

    bucket.grantRead(this);
  }
}
