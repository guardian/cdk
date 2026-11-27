import { readFileSync } from "node:fs";
import { ArnFormat, Duration, Stack, Token } from "aws-cdk-lib";
import { Alarm, ComparisonOperator, MathExpression, Metric, TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Effect, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import type { IRole } from "aws-cdk-lib/aws-iam";
import type { IKey } from "aws-cdk-lib/aws-kms";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Topic } from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";
import type { IConstruct } from "constructs";
import type { GuStack } from "../../core";

export interface PlaySecretRotationProps {
  /** Full path to the existing SecureString used by Play's `SecretSupplier`. */
  readonly parameterName: string;
  /** Whole minutes, from five minutes to six days, and strictly longer than usage delay plus overlap. */
  readonly interval: Duration;
  /** The usage delay configured in Play, allowing all replicas to notice a new version. */
  readonly usageDelay: Duration;
  /** The time Play keeps accepting the previous secret after switching to the new one. */
  readonly overlapDuration: Duration;
  /** The existing parameter's tier. Defaults to Standard. */
  readonly parameterTier?: "Standard" | "Advanced";
  /** The existing customer-managed KMS key, not an alias. Omit for `aws/ssm`. */
  readonly kmsKey?: IKey;
  /** Optional SNS topic name for rotation alarms. Defaults to the app's monitoring topic, if configured. */
  readonly snsTopicName?: string;
}

interface PlaySecretRotationConstructProps extends PlaySecretRotationProps {
  readonly appScope: Construct;
}

const maxEventAge = Duration.minutes(1);
const minimumRotationInterval = Duration.minutes(5);
const successReportingGrace = Duration.minutes(2);
const registrations = new WeakMap<IConstruct, Array<{ stack: GuStack; name: string }>>();

function registerWriter(stack: GuStack, name: string) {
  const root = stack.node.root;
  const writers = registrations.get(root) ?? [];
  const hasConcreteEnvironment = !Token.isUnresolved(stack.account) && !Token.isUnresolved(stack.region);
  if (
    writers.some(
      (writer) =>
        writer.name === name &&
        (writer.stack === stack ||
          (hasConcreteEnvironment && writer.stack.account === stack.account && writer.stack.region === stack.region)),
    )
  ) {
    throw new Error(`Multiple Play secret rotation writers for ${name}`);
  }
  writers.push({ stack, name });
  registrations.set(root, writers);
}

function validate({ parameterName, interval, usageDelay, overlapDuration, kmsKey }: PlaySecretRotationProps) {
  if (
    Token.isUnresolved(parameterName) ||
    !/^\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(parameterName) ||
    /^\/(?:aws|ssm)/i.test(parameterName)
  ) {
    throw new Error("Play secret rotation requires a literal, absolute Parameter Store path");
  }
  if (
    kmsKey &&
    ("aliasName" in kmsKey ||
      kmsKey.keyArn.includes(":alias/") ||
      (!Token.isUnresolved(kmsKey.keyArn) && !/^arn:[^:]+:kms:[^:]+:\d{12}:key\/[^/]+$/.test(kmsKey.keyArn)))
  ) {
    throw new Error("Play secret rotation requires a KMS key ARN, not an alias");
  }
  const intervalMs = interval.toMilliseconds();
  const delayMs = usageDelay.toMilliseconds();
  const overlapMs = overlapDuration.toMilliseconds();
  if (!Number.isSafeInteger(delayMs) || delayMs < 0 || !Number.isSafeInteger(overlapMs) || overlapMs <= 0) {
    throw new Error("Play secret rotation requires a non-negative usage delay and positive overlap duration");
  }
  if (
    !Number.isSafeInteger(intervalMs) ||
    intervalMs % Duration.minutes(1).toMilliseconds() !== 0 ||
    intervalMs < minimumRotationInterval.toMilliseconds() ||
    intervalMs > Duration.days(6).toMilliseconds() ||
    intervalMs <= delayMs + overlapMs
  ) {
    throw new Error(
      "Play secret rotation interval must be whole minutes, at least five minutes and at most six days, and exceed the transition window",
    );
  }
  return delayMs + overlapMs;
}

export class PlaySecretRotation extends Construct {
  private readonly parameterArn: string;
  private readonly key?: IKey;
  private readonly kmsConditions: Record<string, Record<string, string>>;

  constructor(scope: GuStack, props: PlaySecretRotationConstructProps) {
    if (Stack.of(props.appScope) !== scope) {
      throw new Error("Play secret rotation app scope must belong to the supplied GuStack");
    }
    const transitionMs = validate(props);
    super(props.appScope, "PlaySecretRotation");
    const stack = scope;
    registerWriter(stack, props.parameterName);
    const { interval, kmsKey, parameterTier = "Standard", snsTopicName } = props;
    this.parameterArn = stack.formatArn({
      service: "ssm",
      resource: "parameter",
      resourceName: props.parameterName.slice(1),
      arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
    });
    this.key = kmsKey;
    this.kmsConditions = {
      StringEquals: {
        "kms:ViaService": `ssm.${stack.region}.${stack.urlSuffix}`,
        "kms:EncryptionContext:PARAMETER_ARN": this.parameterArn,
      },
    };

    const logGroup = new LogGroup(this, "Logs", { retention: RetentionDays.ONE_MONTH });
    const metricNamespace = `Guardian/PlaySecretRotation/${stack.stackName}/${this.node.addr}`;
    const successMetricName = "SuccessfulScheduledRotations";
    const writerRole = new Role(this, "WriterRole", { assumedBy: new ServicePrincipal("lambda.amazonaws.com") });
    logGroup.grantWrite(writerRole);
    const writer = new Function(this, "Writer", {
      runtime: Runtime.NODEJS_24_X,
      handler: "index.handler",
      code: Code.fromInline(readFileSync(require.resolve("./handler"), "utf8")),
      logGroup,
      role: writerRole,
      timeout: Duration.seconds(15),
      reservedConcurrentExecutions: 1,
      retryAttempts: 0,
      maxEventAge,
      environment: {
        PARAMETER_NAME: props.parameterName,
        PARAMETER_TIER: parameterTier,
        CUSTOMER_MANAGED_KEY: String(kmsKey !== undefined),
        MAX_EVENT_AGE_MS: String(maxEventAge.toMilliseconds()),
        TRANSITION_MS: String(transitionMs),
        METRIC_NAMESPACE: metricNamespace,
        SUCCESS_METRIC_NAME: successMetricName,
      },
    });
    writer.addToRolePolicy(new PolicyStatement({ actions: ["ssm:DescribeParameters"], resources: ["*"] }));
    writer.addToRolePolicy(
      new PolicyStatement({
        actions: ["ssm:PutParameter"],
        resources: [this.parameterArn],
        conditions: { StringEquals: { "ssm:Overwrite": "true" } },
      }),
    );
    if (kmsKey) {
      const encryptionAction = parameterTier === "Advanced" ? "kms:GenerateDataKey" : "kms:Encrypt";
      writer.addToRolePolicy(
        new PolicyStatement({
          actions: [encryptionAction],
          resources: [kmsKey.keyArn],
          conditions: this.kmsConditions,
        }),
      );
      // SSM can report a key alias. Never let a retargeted alias encrypt a version under a different key.
      writer.addToRolePolicy(
        new PolicyStatement({ effect: Effect.DENY, actions: [encryptionAction], notResources: [kmsKey.keyArn] }),
      );
    }

    const rule = new Rule(this, "Schedule", {
      schedule: Schedule.rate(interval),
      targets: [new LambdaFunction(writer, { maxEventAge, retryAttempts: 0 })],
    });
    rule.node.addDependency(writer, writerRole);

    const errors = new Alarm(this, "Failures", {
      alarmDescription: "The Play secret rotation Lambda failed. See its logs for the failure category.",
      metric: writer.metricErrors({ period: Duration.minutes(1), statistic: "Sum" }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });
    const alarmPeriod = interval.plus(successReportingGrace);
    const successes = new Metric({
      namespace: metricNamespace,
      metricName: successMetricName,
      period: alarmPeriod,
      statistic: "Maximum",
    });
    const missed = new Alarm(this, "MissedRotations", {
      alarmDescription:
        "No successful Play secret rotation was recorded within the rotation interval plus two minutes.",
      metric: new MathExpression({
        expression: "FILL(rotations, 0)",
        usingMetrics: { rotations: successes },
        period: alarmPeriod,
      }),
      threshold: 1,
      comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: TreatMissingData.BREACHING,
    });
    if (snsTopicName) {
      const topic = Topic.fromTopicArn(this, "AlarmTopic", stack.formatArn({ service: "sns", resource: snsTopicName }));
      for (const alarm of [errors, missed]) {
        alarm.addAlarmAction(new SnsAction(topic));
      }
    }
  }

  grantRead(role: IRole) {
    const { policyDependable } = role.addToPrincipalPolicy(
      new PolicyStatement({ actions: ["ssm:GetParameters"], resources: [this.parameterArn] }),
    );
    if (this.key) {
      role.addToPrincipalPolicy(
        new PolicyStatement({
          actions: ["kms:Decrypt"],
          resources: [this.key.keyArn],
          conditions: this.kmsConditions,
        }),
      );
    }
    return policyDependable;
  }
}
