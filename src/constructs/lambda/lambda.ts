import { Code, Function, RuntimeFamily } from "@aws-cdk/aws-lambda";
import type { FunctionProps, Runtime } from "@aws-cdk/aws-lambda";
import { Bucket } from "@aws-cdk/aws-s3";
import { Duration } from "@aws-cdk/core";
import { GuDistributable } from "../../types/distributable";
import { GuLambdaErrorPercentageAlarm } from "../cloudwatch";
import type { GuLambdaErrorPercentageMonitoringProps } from "../cloudwatch";
import { GuDistributionBucketParameter } from "../core";
import type { GuStack } from "../core";
import { AppIdentity } from "../core/identity";
import { GuParameterStoreReadPolicyStatement } from "../iam";

export interface GuFunctionProps extends GuDistributable, Omit<FunctionProps, "code">, AppIdentity {
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

/**
 * Construct which creates a Lambda function.
 *
 * This lambda relies on the code artifact residing in a standard location in S3. For more details on the bucket used,
 * see [[`GuDistributionBucketParameter`]]. By default, the path used will be `stack/stage/app/fileName`.
 *
 * The default memory size of this Lambda will vary depending on the runtime chosen.
 * For Java runtimes (i.e. resource hungry Scala Lambdas!), 1024MB will be used. For all other runtimes,
 * the memory size defaults to 512MB. This can be overridden via the `memorySize` prop.
 *
 * By default, the timeout for this lambda is 30 seconds. This can be overridden via the `timeout` prop.
 *
 * By default the Lambda is granted permission to read from the SSM parameter store subtree specific to this lambda
 * (i.e. it can read all keys under <stage>/<stack>/<app>/). The lambda has STACK/STAGE/APP environment variables
 * which can be used to determine its identity.
 *
 * Note that this construct creates a Lambda without a trigger/event source. Depending on your use-case, you may wish to
 * consider using a pattern which instantiates a Lambda with a trigger e.g. [[`GuScheduledLambda`]].
 */
export class GuLambdaFunction extends Function {
  constructor(scope: GuStack, id: string, props: GuFunctionProps) {
    const { app, fileName, runtime, memorySize, timeout } = props;

    const defaultEnvironmentVariables = {
      STACK: scope.stack,
      STAGE: scope.stage,
      APP: app,
    };

    const bucket = Bucket.fromBucketName(
      scope,
      `${id}-bucket`,
      GuDistributionBucketParameter.getInstance(scope).valueAsString
    );
    const objectKey = GuDistributable.getObjectKey(scope, { app }, { fileName });
    const code = Code.fromBucket(bucket, objectKey);
    super(scope, id, {
      ...props,
      environment: {
        ...props.environment,
        ...defaultEnvironmentVariables,
      },
      memorySize: defaultMemorySize(runtime, memorySize),
      timeout: timeout ?? Duration.seconds(30),
      code,
    });

    if (props.errorPercentageMonitoring) {
      new GuLambdaErrorPercentageAlarm(scope, `${id}-ErrorPercentageAlarmForLambda`, {
        ...props.errorPercentageMonitoring,
        lambda: this,
      });
    }

    bucket.grantRead(this);

    const ssmParamReadPolicy = new GuParameterStoreReadPolicyStatement(scope, props);
    this.addToRolePolicy(ssmParamReadPolicy);

    AppIdentity.taggedConstruct(props, this);
  }
}
