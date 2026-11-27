import { Duration } from "aws-cdk-lib";
import { Capture, Match, Template } from "aws-cdk-lib/assertions";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Alias, Key } from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";
import { simpleGuStackForTesting } from "../../../utils/test";
import type { PlaySecretRotationProps } from "./rotation";
import { PlaySecretRotation } from "./rotation";

const env = { account: "123456789012", region: "eu-west-1" };
const parameterName = "/existing/play/secret";
const rotationProps = {
  parameterName,
  interval: Duration.hours(6),
  usageDelay: Duration.minutes(3),
  overlapDuration: Duration.hours(2),
  snsTopicName: "alarms",
};

test.each([
  { parameterTier: "Advanced" as const, kmsAction: "kms:GenerateDataKey" },
  { parameterTier: "Standard" as const, kmsAction: "kms:Encrypt" },
])("schedules one writer with separate read and write permissions ($parameterTier)", ({ parameterTier, kmsAction }) => {
  const stack = simpleGuStackForTesting({ env });
  const kmsKey = new Key(stack, "ExistingParameterKey");
  const reader = new Role(stack, "Reader", { assumedBy: new ServicePrincipal("ec2.amazonaws.com") });
  new PlaySecretRotation(stack, {
    ...rotationProps,
    appScope: new Construct(stack, "PlayApp"),
    kmsKey,
    parameterTier,
  }).grantRead(reader);
  const template = Template.fromStack(stack);
  const parameterArn = {
    "Fn::Join": ["", ["arn:", { Ref: "AWS::Partition" }, ":ssm:eu-west-1:123456789012:parameter/existing/play/secret"]],
  };
  const roleId = (service: string) =>
    template.getResourceId("AWS::IAM::Role", {
      Properties: {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([Match.objectLike({ Principal: { Service: service } })]),
        },
        ManagedPolicyArns: Match.absent(),
      },
    });
  const writerRole = roleId("lambda.amazonaws.com");
  const keyArn = { "Fn::GetAtt": [template.getResourceId("AWS::KMS::Key"), "Arn"] };

  template.resourceCountIs("AWS::Lambda::Function", 1);
  template.hasResourceProperties("AWS::Lambda::Function", {
    ReservedConcurrentExecutions: 1,
    Role: { "Fn::GetAtt": [writerRole, "Arn"] },
    Code: { ZipFile: Match.stringLikeRegexp("CloudWatchMetrics") },
    Environment: {
      Variables: {
        PARAMETER_NAME: parameterName,
        PARAMETER_TIER: parameterTier,
        CUSTOMER_MANAGED_KEY: "true",
        TRANSITION_MS: "7380000",
        MAX_EVENT_AGE_MS: "60000",
      },
    },
  });
  template.resourceCountIs("AWS::Events::Rule", 1);
  template.hasResourceProperties("AWS::Events::Rule", {
    ScheduleExpression: "rate(6 hours)",
    Targets: [Match.objectLike({ RetryPolicy: { MaximumRetryAttempts: 0, MaximumEventAgeInSeconds: 60 } })],
  });
  template.hasResourceProperties("AWS::Lambda::EventInvokeConfig", {
    MaximumEventAgeInSeconds: 60,
    MaximumRetryAttempts: 0,
  });
  template.resourceCountIs("AWS::SSM::Parameter", 0);
  template.resourceCountIs("AWS::CloudWatch::Alarm", 2);
  template.hasResourceProperties("AWS::CloudWatch::Alarm", {
    Threshold: 1,
    Metrics: Match.arrayWith([
      Match.objectLike({ MetricStat: { Metric: { MetricName: "SuccessfulScheduledRotations" }, Period: 21_720 } }),
    ]),
    AlarmActions: [{ "Fn::Join": ["", ["arn:", { Ref: "AWS::Partition" }, ":sns:eu-west-1:123456789012:alarms"]] }],
  });

  const onParameter = {
    StringEquals: { "kms:ViaService": Match.anyValue(), "kms:EncryptionContext:PARAMETER_ARN": parameterArn },
  };
  template.hasResourceProperties("AWS::IAM::Policy", {
    Roles: [{ Ref: writerRole }],
    PolicyDocument: {
      Statement: [
        {
          Action: ["logs:CreateLogStream", "logs:PutLogEvents"],
          Effect: "Allow",
          Resource: { "Fn::GetAtt": [template.getResourceId("AWS::Logs::LogGroup"), "Arn"] },
        },
        { Action: "ssm:DescribeParameters", Effect: "Allow", Resource: "*" },
        {
          Action: "ssm:PutParameter",
          Condition: { StringEquals: { "ssm:Overwrite": "true" } },
          Effect: "Allow",
          Resource: parameterArn,
        },
        { Action: kmsAction, Condition: onParameter, Effect: "Allow", Resource: keyArn },
        { Action: kmsAction, Effect: "Deny", NotResource: keyArn },
      ],
    },
  });
  template.hasResourceProperties("AWS::IAM::Policy", {
    Roles: [{ Ref: roleId("ec2.amazonaws.com") }],
    PolicyDocument: {
      Statement: [
        { Action: "ssm:GetParameters", Effect: "Allow", Resource: parameterArn },
        { Action: "kms:Decrypt", Condition: onParameter, Effect: "Allow", Resource: keyArn },
      ],
    },
  });
});

test("writers with identical construct paths in different deployed stacks do not share success metrics", () => {
  const metricNamespace = (cloudFormationStackName: string, name: string) => {
    const stack = simpleGuStackForTesting({ env, cloudFormationStackName });
    new PlaySecretRotation(stack, {
      ...rotationProps,
      appScope: new Construct(stack, "PlayApp"),
      parameterName: name,
    });
    const template = Template.fromStack(stack);
    const namespace = new Capture();
    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: { METRIC_NAMESPACE: namespace, SUCCESS_METRIC_NAME: "SuccessfulScheduledRotations" },
      },
    });
    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      Metrics: Match.arrayWith([
        Match.objectLike({
          MetricStat: { Metric: { MetricName: "SuccessfulScheduledRotations", Namespace: namespace.asString() } },
        }),
      ]),
    });
    return namespace.asString();
  };

  expect(metricNamespace("PlayAppOne", "/one/play")).not.toBe(metricNamespace("PlayAppTwo", "/two/play"));
});

test.each([
  { interval: Duration.minutes(5), period: 420 },
  { interval: Duration.days(6), period: 518_520 },
])("checks for any success in a $period-second window without counting duplicates", ({ interval, period }) => {
  const stack = simpleGuStackForTesting({ env });
  new PlaySecretRotation(stack, {
    ...rotationProps,
    appScope: new Construct(stack, "PlayApp"),
    interval,
    usageDelay: Duration.seconds(10),
    overlapDuration: Duration.seconds(20),
  });

  Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
    ComparisonOperator: "LessThanThreshold",
    EvaluationPeriods: 1,
    Metrics: Match.arrayWith([
      Match.objectLike({
        Expression: "FILL(rotations, 0)",
        ReturnData: true,
      }),
      Match.objectLike({
        Id: "rotations",
        MetricStat: { Metric: { MetricName: "SuccessfulScheduledRotations" }, Period: period, Stat: "Maximum" },
      }),
    ]),
    Threshold: 1,
    TreatMissingData: "breaching",
  });
});

test("rejects a mismatched stack without reserving the app's rotation construct ID", () => {
  const stack = simpleGuStackForTesting({ env });
  const otherStack = simpleGuStackForTesting({ env });
  const appScope = new Construct(stack, "PlayApp");
  const props = { ...rotationProps, appScope };

  expect(() => new PlaySecretRotation(otherStack, props)).toThrow("app scope must belong to the supplied GuStack");
  expect(() => new PlaySecretRotation(stack, props)).not.toThrow();
});

test("rejects a second writer for the same parameter", () => {
  const stack = simpleGuStackForTesting({ env });
  new PlaySecretRotation(stack, { ...rotationProps, appScope: new Construct(stack, "PlayApp") });
  expect(() => new PlaySecretRotation(stack, { ...rotationProps, appScope: new Construct(stack, "Worker") })).toThrow(
    "Multiple Play secret rotation writers",
  );
});

test("rejects imported KMS aliases as rotation keys", () => {
  const stack = simpleGuStackForTesting({ env });
  const kmsKey = Alias.fromAliasName(stack, "PlayKey", "alias/play-secret");
  expect(
    () => new PlaySecretRotation(stack, { ...rotationProps, appScope: new Construct(stack, "PlayApp"), kmsKey }),
  ).toThrow("requires a KMS key ARN, not an alias");
});

test.each<{ overrides: Partial<PlaySecretRotationProps>; error: string }>([
  { overrides: { interval: Duration.minutes(123) }, error: "exceed the transition window" },
  { overrides: { interval: Duration.seconds(7401) }, error: "must be whole minutes" },
  { overrides: { interval: Duration.days(7) }, error: "at most six days" },
  {
    overrides: {
      interval: Duration.minutes(4),
      usageDelay: Duration.minutes(1),
      overlapDuration: Duration.minutes(1),
    },
    error: "at least five minutes",
  },
  { overrides: { parameterName: "/example/*" }, error: "requires a literal, absolute Parameter Store path" },
])("rejects invalid rotation configuration: $error", ({ overrides, error }) => {
  const stack = simpleGuStackForTesting({ env });
  expect(
    () =>
      new PlaySecretRotation(stack, {
        ...rotationProps,
        ...overrides,
        appScope: new Construct(stack, "PlayApp"),
      }),
  ).toThrow(error);
});
