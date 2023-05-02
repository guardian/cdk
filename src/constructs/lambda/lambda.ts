/* eslint "@guardian/tsdoc-required/tsdoc-required": 2 -- to begin rolling this out for public APIs. */
import { Duration } from "aws-cdk-lib";
import type { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Code, Function, RuntimeFamily } from "aws-cdk-lib/aws-lambda";
import type { FunctionProps, Runtime } from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { GuDistributable } from "../../types";
import { GuLambdaErrorPercentageAlarm, GuLambdaThrottlingAlarm } from "../cloudwatch";
import type { GuLambdaErrorPercentageMonitoringProps, GuLambdaThrottlingMonitoringProps } from "../cloudwatch";
import type { GuStack } from "../core";
import { AppIdentity, GuDistributionBucketParameter } from "../core";
import { ReadParametersByName, ReadParametersByPath } from "../iam";

export interface GuFunctionProps extends GuDistributable, Omit<FunctionProps, "code">, AppIdentity {
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
  /**
   * SSM parameter for the S3 bucket that contains your lambda file.
   *
   * Typically you should not override this but you may need to if, for example,
   * you are referencing a file that is shared across many apps and/or AWS
   * accounts.
   *
   * @defaultValue  [[`GuDistributionBucketParameter`]]
   */
  bucketNamePath?: string;
  /**
   * Set to `true` to use the filename *without* the stage/stack/app prefix.
   *
   * Typically you should not override this but you may need to if, for example,
   * you are referencing a file that is shared across many apps and/or AWS
   * accounts.
   */
  withoutFilePrefix?: boolean;
  /**
   * TODO
   */
  managedDeployment?: boolean;
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
 * This Lambda relies on the code artifact residing in a standard location in
 * S3. For more details on the bucket used, see
 * [[`GuDistributionBucketParameter`]]. By default, the path used will be
 * `<stack>/<stage>/<app</<fileName>`. If required, e.g. if you are sharing
 * lambda code across apps or accounts, override the source bucket using the
 * `bucketNamePath` prop.
 *
 * The default memory size of this Lambda will vary depending on the runtime
 * chosen. For Java runtimes (i.e. resource hungry Scala Lambdas!), 1024MB will
 * be used. For all other runtimes, the memory size defaults to 512MB. This can
 * be overridden via the `memorySize` prop.
 *
 * By default, the timeout for this Lambda is 30 seconds. This can be overridden
 * via the `timeout` prop.
 *
 * By default the Lambda is granted permission to read from the SSM parameter
 * store subtree specific to this Lambda (i.e. it can read all keys under
 * `/<stage>/<stack>/<app>/`). If you need to add additional permissions, you
 * can use
 * [`addToRolePolicy`](`https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-lambda.FunctionBase.html#addwbrtowbrrolewbrpolicystatement`).
 *
 * The Lambda has `STACK`, `STAGE` and `APP` environment variables which can be
 * used to determine its identity.
 *
 * Note that this construct creates a Lambda without an event source. Depending
 * on your use-case, you may wish to consider using a pattern which instantiates
 * a Lambda with an event source e.g. [[`GuScheduledLambda`]].
 */
export class GuLambdaFunction extends Function {
  public readonly app: string;
  public readonly fileName: string;
  public readonly bucketNamePath: string | undefined;
  public readonly managedDeployment: boolean;
  public readonly withoutFilePrefix: boolean;

  constructor(scope: GuStack, id: string, props: GuFunctionProps) {
    const {
      app,
      fileName,
      runtime,
      memorySize,
      timeout,
      bucketNamePath,
      withoutFilePrefix = false,
      managedDeployment = false,
    } = props;

    const bucketName = bucketNamePath
      ? StringParameter.fromStringParameterName(scope, "bucketoverride", bucketNamePath).stringValue
      : GuDistributionBucketParameter.getInstance(scope).valueAsString;

    const defaultEnvironmentVariables = {
      STACK: scope.stack,
      STAGE: scope.stage,
      APP: app,
    };

    const bucket = Bucket.fromBucketName(scope, `${id}-bucket`, bucketName);
    const objectKey = withoutFilePrefix ? fileName : GuDistributable.getObjectKey(scope, { app }, { fileName });
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
    this.bucketNamePath = bucketNamePath;
    this.managedDeployment = managedDeployment;
    this.withoutFilePrefix = withoutFilePrefix;

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
