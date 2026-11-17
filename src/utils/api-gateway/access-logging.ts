import { Annotations, Names } from "aws-cdk-lib";
import type { RestApiProps, StageOptions } from "aws-cdk-lib/aws-apigateway";
import { AccessLogFormat, FirehoseLogDestination } from "aws-cdk-lib/aws-apigateway";
import { PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { CfnDeliveryStream } from "aws-cdk-lib/aws-kinesisfirehose";
import { LogGroup, LogStream, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import type { GuStack } from "../../constructs/core";
import { AppIdentity, GuAccessLoggingBucketParameter } from "../../constructs/core";

interface AccessLoggingProps extends AppIdentity, Pick<RestApiProps, "deploy" | "deployOptions"> {
  withAccessLogging?: boolean;
}

export function apiGatewayDeployOptions(
  scope: Construct,
  stack: GuStack,
  props: AccessLoggingProps,
): StageOptions | undefined {
  const { app, deploy, deployOptions, withAccessLogging = true } = props;

  if (!withAccessLogging) {
    Annotations.of(scope).addInfo("Default API Gateway access logging disabled");
    return deployOptions;
  }

  if (deploy === false || deployOptions?.accessLogDestination) {
    return deployOptions;
  }

  const logging = AppIdentity.taggedConstruct(props, new Construct(scope, "AccessLogging"));
  const bucket = Bucket.fromBucketName(
    logging,
    "Bucket",
    GuAccessLoggingBucketParameter.getInstance(stack).valueAsString,
  );
  const prefix = `api-gateway/${stack.stage}/${stack.stack}/${app}/`;
  const logGroup = new LogGroup(logging, "DeliveryErrors", { retention: RetentionDays.ONE_MONTH });
  const logStream = new LogStream(logging, "S3Delivery", { logGroup });
  const role = new Role(logging, "DeliveryRole", {
    assumedBy: new ServicePrincipal("firehose.amazonaws.com"),
    inlinePolicies: {
      Delivery: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ["s3:GetBucketLocation", "s3:ListBucket", "s3:ListBucketMultipartUploads"],
            resources: [bucket.bucketArn],
          }),
          new PolicyStatement({
            actions: ["s3:AbortMultipartUpload", "s3:GetObject", "s3:PutObject"],
            resources: [bucket.arnForObjects(`${prefix}*`)],
          }),
          new PolicyStatement({
            actions: ["logs:PutLogEvents"],
            resources: [logGroup.logGroupArn],
          }),
        ],
      }),
    },
  });
  const stream = new CfnDeliveryStream(logging, "DeliveryStream", {
    deliveryStreamName: `amazon-apigateway-${Names.uniqueResourceName(logging, { maxLength: 47 })}`,
    deliveryStreamType: "DirectPut",
    deliveryStreamEncryptionConfigurationInput: { keyType: "AWS_OWNED_CMK" },
    extendedS3DestinationConfiguration: {
      bucketArn: bucket.bucketArn,
      roleArn: role.roleArn,
      prefix,
      errorOutputPrefix: `${prefix}errors/!{firehose:error-output-type}/`,
      bufferingHints: { intervalInSeconds: 300, sizeInMBs: 5 },
      compressionFormat: "GZIP",
      processingConfiguration: {
        enabled: true,
        processors: [{ type: "AppendDelimiterToRecord" }],
      },
      cloudWatchLoggingOptions: {
        enabled: true,
        logGroupName: logGroup.logGroupName,
        logStreamName: logStream.logStreamName,
      },
    },
  });

  return {
    ...deployOptions,
    accessLogDestination: new FirehoseLogDestination(stream),
    accessLogFormat:
      deployOptions?.accessLogFormat ??
      AccessLogFormat.jsonWithStandardFields({
        caller: false,
        user: false,
        ip: true,
        requestTime: true,
        httpMethod: true,
        resourcePath: true,
        status: true,
        protocol: true,
        responseLength: true,
      }),
  };
}
