import { Duration } from "aws-cdk-lib";
import type { PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { FunctionProps, Runtime } from "aws-cdk-lib/aws-lambda";
import { Alias, Code, Function, RuntimeFamily } from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { GuDistributable } from "../../types";
import type { GuLambdaErrorPercentageMonitoringProps, GuLambdaThrottlingMonitoringProps } from "../cloudwatch";
import { GuLambdaErrorPercentageAlarm, GuLambdaThrottlingAlarm } from "../cloudwatch";
import type { GuStack } from "../core";
import { AppIdentity, GuDistributionBucketParameter } from "../core";
import { ReadParametersByName, ReadParametersByPath } from "../iam";

export interface GuFunctionProps extends GuDistributable, Omit<FunctionProps, "code">, AppIdentity {
  /**
   * Create a new Lambda version and alias. This is only necessary if you want to use features which rely
   * on versioning (e.g. SnapStart or Provisioned Concurrency).
   *
   * If you enable versioning you must ensure that your Lambda function is updated whenever a new build is deployed via
   * CloudFormation. The simplest way to do this is to include the build number in the `fileName` prop.
   */
  enableVersioning?: boolean;

  /**
   * Alarm if error percentage exceeds a threshold.
   */
  errorPercentageMonitoring?: GuLambdaErrorPercentageMonitoringProps;

  /**
   * Alarm if throttling occurs. Note, it is also worth considering a
   * concurrency limit (the `reservedConcurrentExecutions` prop) if you are
   * concerned about throttling.
   *
   * @see https://docs.aws.amazon.com/lambda/latest/dg/concurrent-executions.html
   */
  throttlingMonitoring?: GuLambdaThrottlingMonitoringProps;
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
 * This Lambda relies on the code artifact residing in a standard location in S3. For more details on the bucket used,
 * see [[`GuDistributionBucketParameter`]]. By default, the path used will be `<stack>/<stage>/<app</<fileName>`.
 *
 * The default memory size of this Lambda will vary depending on the runtime chosen.
 * For Java runtimes (i.e. resource hungry Scala Lambdas!), 1024MB will be used. For all other runtimes,
 * the memory size defaults to 512MB. This can be overridden via the `memorySize` prop.
 *
 * By default, the timeout for this Lambda is 30 seconds. This can be overridden via the `timeout` prop.
 *
 * By default the Lambda is granted permission to read from the SSM parameter store subtree specific to this Lambda
 * (i.e. it can read all keys under `/<stage>/<stack>/<app>/`). If you need to add additional permissions, you can use
 * [`addToRolePolicy`](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-lambda.FunctionBase.html#addwbrtowbrrolewbrpolicystatement).
 *
 * The Lambda has `STACK`, `STAGE` and `APP` environment variables which can be used to determine its identity.
 *
 * Note that this construct creates a Lambda without an event source. Depending on your use-case, you may wish to
 * consider using a pattern which instantiates a Lambda with an event source e.g. [[`GuScheduledLambda`]].
 */
export class GuLambdaFunction extends Function {
  public readonly app: string;
  public readonly fileName: string;
  public readonly alias?: Alias;

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

    this.app = app;
    this.fileName = fileName;

    if (props.enableVersioning) {
      this.alias = new Alias(scope, `${id}-AliasForLambda`, {
        aliasName: scope.stage,
        version: this.currentVersion,
      });
    }

    if (props.errorPercentageMonitoring) {
      new GuLambdaErrorPercentageAlarm(scope, `${id}-ErrorPercentageAlarmForLambda`, {
        ...props.errorPercentageMonitoring,
        lambda: this,
      });
    }

    if (props.throttlingMonitoring) {
      new GuLambdaThrottlingAlarm(scope, `${id}-ThrottlingAlarmForLambda`, {
        ...props.throttlingMonitoring,
        lambda: this,
      });
    }

    bucket.grantRead(this, objectKey);

    const ssmParamReadPolicies: PolicyStatement[] = [
      new ReadParametersByPath(scope, props),
      new ReadParametersByName(scope, props),
    ];

    ssmParamReadPolicies.map((policy) => this.addToRolePolicy(policy));

    AppIdentity.taggedConstruct(props, this);
  }
}
