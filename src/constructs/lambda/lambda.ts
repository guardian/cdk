import { Duration } from "aws-cdk-lib";
import { Repository } from "aws-cdk-lib/aws-ecr";
import type { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Code, Function, Handler, Runtime , RuntimeFamily } from "aws-cdk-lib/aws-lambda";
import type { FunctionOptions, FunctionProps } from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { GuDistributable } from "../../types";
import { GuLambdaErrorPercentageAlarm, GuLambdaThrottlingAlarm } from "../cloudwatch";
import type { GuLambdaErrorPercentageMonitoringProps, GuLambdaThrottlingMonitoringProps } from "../cloudwatch";
import type { GuStack } from "../core";
import { AppIdentity, GuDistributionBucketParameter } from "../core";
import { ReadParametersByName, ReadParametersByPath } from "../iam";

interface AlarmProps {
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

interface RepositoryProps {
  repositoryArn: string;
  repositoryName: string;
  tagOrDigest?: string;
}

export interface GuFunctionProps extends GuDistributable, Omit<FunctionProps, "code">, AppIdentity, AlarmProps {}

export interface GuFunctionDockerProps extends FunctionOptions, AppIdentity, AlarmProps, RepositoryProps {}

interface LambdaProps extends FunctionProps, AppIdentity, AlarmProps {}

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

abstract class LambdaBaseFunction extends Function {
  public readonly app: string;
  constructor(scope: GuStack, id: string, props: LambdaProps) {
    const { app, runtime, memorySize, timeout, code } = props;

    const defaultEnvironmentVariables = {
      STACK: scope.stack,
      STAGE: scope.stage,
      APP: app,
    };

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
    const ssmParamReadPolicies: PolicyStatement[] = [
      new ReadParametersByPath(scope, props),
      new ReadParametersByName(scope, props),
    ];

    ssmParamReadPolicies.map((policy) => this.addToRolePolicy(policy));

    AppIdentity.taggedConstruct(props, this);
  }
}
export class GuLambdaFunction extends LambdaBaseFunction {
  public readonly fileName: string;
  constructor(scope: GuStack, id: string, props: GuFunctionProps) {
    const { app, fileName } = props;
    const bucket = Bucket.fromBucketName(
      scope,
      `${id}-bucket`,
      GuDistributionBucketParameter.getInstance(scope).valueAsString
    );
    const objectKey = GuDistributable.getObjectKey(scope, { app }, { fileName });
    const code = Code.fromBucket(bucket, objectKey);
    super(scope, id, {
      ...props,
      code,
    });
    this.fileName = fileName;
    bucket.grantRead(this, objectKey);
  }
}

export class GuLambdaDockerFunction extends LambdaBaseFunction {
  public readonly app: string;
  constructor(scope: GuStack, id: string, props: GuFunctionDockerProps) {

    const repository = Repository.fromRepositoryAttributes(scope, `${id}-ecr-repo`, {
      repositoryArn: props.repositoryArn,
      repositoryName: props.repositoryName,
    });

    super(scope, id, {
      ...props,
      code: Code.fromEcrImage(repository, {
        tagOrDigest: props.tagOrDigest,
      }),
      runtime: Runtime.FROM_IMAGE,
      handler: Handler.FROM_IMAGE,
    });
    this.app = props.app;
  }
}
