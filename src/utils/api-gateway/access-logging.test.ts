import { App } from "aws-cdk-lib";
import { Annotations, Match, Template } from "aws-cdk-lib/assertions";
import type { RestApiProps } from "aws-cdk-lib/aws-apigateway";
import { AccessLogFormat, LogGroupLogDestination } from "aws-cdk-lib/aws-apigateway";
import { CfnDeliveryStream } from "aws-cdk-lib/aws-kinesisfirehose";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { GuStack } from "../../constructs/core";
import { GuLambdaFunction } from "../../constructs/lambda";
import { GuApiLambda } from "../../patterns/api-lambda";
import { GuApiGatewayWithLambdaByPath } from "../../patterns/api-multiple-lambdas";
import { simpleGuStackForTesting } from "../test";

interface TestOptions extends RestApiProps {
  withAccessLogging?: boolean;
}

const lambdaProps = {
  app: "testing",
  fileName: "my-app.zip",
  handler: "handler.ts",
  runtime: Runtime.NODEJS_LATEST,
};

const patterns = [
  {
    name: "GuApiLambda",
    create: (stack: GuStack, { withAccessLogging, ...api }: TestOptions) =>
      new GuApiLambda(stack, "Lambda", {
        ...lambdaProps,
        monitoringConfiguration: { noMonitoring: true },
        withAccessLogging,
        api: { id: "Api", ...api },
      }),
  },
  {
    name: "GuApiGatewayWithLambdaByPath",
    create: (stack: GuStack, options: TestOptions) =>
      new GuApiGatewayWithLambdaByPath(stack, {
        app: "testing",
        monitoringConfiguration: { noMonitoring: true },
        targets: [
          {
            path: "/test",
            httpMethod: "GET",
            lambda: new GuLambdaFunction(stack, "Lambda", lambdaProps),
          },
        ],
        ...options,
      }),
  },
] as const;

describe.each(patterns)("$name access logging", ({ create }) => {
  it("delivers access logs to the account bucket even when alarms are disabled", () => {
    const stack = simpleGuStackForTesting();
    create(stack, {});
    const template = Template.fromStack(stack);
    const streams = template.findResources("AWS::KinesisFirehose::DeliveryStream");
    const streamId = Object.keys(streams)[0];
    template.resourceCountIs("AWS::KinesisFirehose::DeliveryStream", 1);
    template.resourceCountIs("AWS::CloudWatch::Alarm", 0);
    template.hasParameter("AccessLoggingBucket", {
      Default: "/account/services/access-logging/bucket",
    });
    template.hasResourceProperties("AWS::ApiGateway::Stage", {
      AccessLogSetting: {
        DestinationArn: { "Fn::GetAtt": [streamId, "Arn"] },
        Format: Match.stringLikeRegexp("\\$context.requestId"),
      },
    });
    template.hasResourceProperties("AWS::KinesisFirehose::DeliveryStream", {
      DeliveryStreamName: Match.stringLikeRegexp("^amazon-apigateway-[a-zA-Z0-9]{1,47}$"),
      DeliveryStreamEncryptionConfigurationInput: { KeyType: "AWS_OWNED_CMK" },
      ExtendedS3DestinationConfiguration: {
        BucketARN: {
          "Fn::Join": ["", ["arn:", { Ref: "AWS::Partition" }, ":s3:::", { Ref: "AccessLoggingBucket" }]],
        },
        Prefix: "api-gateway/TEST/test-stack/testing/",
        ProcessingConfiguration: {
          Enabled: true,
          Processors: [{ Type: "AppendDelimiterToRecord" }],
        },
        CloudWatchLoggingOptions: { Enabled: true },
      },
    });
  });

  it("can disable defaults without creating unused resources or a bucket parameter", () => {
    const stack = simpleGuStackForTesting();
    const pattern = create(stack, { withAccessLogging: false });
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::ApiGateway::Stage", { AccessLogSetting: Match.absent() });
    template.resourceCountIs("AWS::KinesisFirehose::DeliveryStream", 0);
    template.resourceCountIs("AWS::Logs::LogGroup", 0);
    expect(template.findParameters("AccessLoggingBucket")).toEqual({});
    Annotations.fromStack(stack).hasInfo(`/${pattern.node.path}`, "Default API Gateway access logging disabled");
  });

  it.each([true, false])("preserves explicit access logging with defaults enabled=%s", (withAccessLogging) => {
    const stack = simpleGuStackForTesting();
    const logGroup = new LogGroup(stack, "CustomLogs");
    create(stack, {
      withAccessLogging,
      deployOptions: {
        accessLogDestination: new LogGroupLogDestination(logGroup),
        accessLogFormat: AccessLogFormat.custom("$context.requestId $context.status"),
      },
    });
    const template = Template.fromStack(stack);
    const destinationArn: unknown = stack.resolve(logGroup.logGroupArn);
    template.hasResourceProperties("AWS::ApiGateway::Stage", {
      AccessLogSetting: {
        DestinationArn: destinationArn,
        Format: "$context.requestId $context.status",
      },
    });
    template.resourceCountIs("AWS::KinesisFirehose::DeliveryStream", 0);
    expect(template.findParameters("AccessLoggingBucket")).toEqual({});
  });

  it("preserves a custom format and unrelated deployment options with the default destination", () => {
    const stack = simpleGuStackForTesting();
    create(stack, {
      deployOptions: {
        accessLogFormat: AccessLogFormat.custom("$context.requestId $context.status"),
        stageName: "custom",
        tracingEnabled: true,
        variables: { name: "value" },
        throttlingRateLimit: 10,
      },
    });
    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::KinesisFirehose::DeliveryStream", 1);
    template.hasResourceProperties("AWS::ApiGateway::Stage", {
      AccessLogSetting: { Format: "$context.requestId $context.status" },
      StageName: "custom",
      TracingEnabled: true,
      Variables: { name: "value" },
      MethodSettings: Match.arrayWith([Match.objectLike({ ThrottlingRateLimit: 10 })]),
    });
  });

  it("does not create a destination when automatic deployment is disabled", () => {
    const stack = simpleGuStackForTesting();
    create(stack, { deploy: false });
    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::ApiGateway::Stage", 0);
    template.resourceCountIs("AWS::KinesisFirehose::DeliveryStream", 0);
    expect(template.findParameters("AccessLoggingBucket")).toEqual({});
  });

  it("retains CDK validation for an invalid explicit log format", () => {
    const stack = simpleGuStackForTesting();
    expect(() =>
      create(stack, {
        deployOptions: { accessLogFormat: AccessLogFormat.custom("$context.status") },
      }),
    ).toThrow(/contextRequestId/);
  });
});

describe("API Gateway delivery resources", () => {
  it("scopes S3 permissions to the destination prefix and includes them in the referenced role", () => {
    const stack = simpleGuStackForTesting();
    patterns[0].create(stack, {});
    const template = Template.fromStack(stack);
    const roleId = Object.keys(
      template.findResources("AWS::IAM::Role", {
        Properties: { AssumeRolePolicyDocument: { Statement: [{ Principal: { Service: "firehose.amazonaws.com" } }] } },
      }),
    )[0];
    expect(roleId).toBeDefined();
    template.hasResourceProperties("AWS::KinesisFirehose::DeliveryStream", {
      ExtendedS3DestinationConfiguration: {
        RoleARN: { "Fn::GetAtt": [roleId, "Arn"] },
      },
    });
    template.hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: [{ Action: "sts:AssumeRole", Effect: "Allow", Principal: { Service: "firehose.amazonaws.com" } }],
      },
      Policies: [
        {
          PolicyName: "Delivery",
          PolicyDocument: {
            Statement: Match.arrayWith([
              {
                Action: ["s3:AbortMultipartUpload", "s3:GetObject", "s3:PutObject"],
                Effect: "Allow",
                Resource: {
                  "Fn::Join": [
                    "",
                    [
                      "arn:",
                      { Ref: "AWS::Partition" },
                      ":s3:::",
                      { Ref: "AccessLoggingBucket" },
                      "/api-gateway/TEST/test-stack/testing/*",
                    ],
                  ],
                },
              },
            ]),
          },
        },
      ],
    });
  });

  it("creates unique stream names for APIs in the same stack and across stacks", () => {
    const app = new App();
    const streams: Array<string | undefined> = [];
    const stacks = ["CODE", "PROD"].map((stage) => new GuStack(app, stage, { stack: "test-stack", stage }));
    for (const stack of stacks) {
      for (const id of ["One", "Two"]) {
        new GuApiLambda(stack, id, {
          ...lambdaProps,
          monitoringConfiguration: { noMonitoring: true },
          api: { id: "Api" },
        });
      }
      for (const resource of stack.node.findAll()) {
        if (resource instanceof CfnDeliveryStream) {
          streams.push(resource.deliveryStreamName);
        }
      }
    }
    for (const stack of stacks) {
      expect(Object.keys(Template.fromStack(stack).findParameters("AccessLoggingBucket"))).toHaveLength(1);
    }
    expect(streams).toHaveLength(4);
    expect(streams).not.toContain(undefined);
    expect(new Set(streams).size).toBe(4);
  });
});
