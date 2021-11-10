export interface SsmParameterPath {
  path: string;
  description: string;
}

export const VPC_SSM_PARAMETER_PREFIX = "/account/vpc";

export const SSM_PARAMETER_PATHS: Record<string, SsmParameterPath> = {
  Anghammarad: {
    path: "/account/services/anghammarad.topic.arn",
    description: "SSM parameter containing the ARN of the Anghammarad SNS topic",
  },
  LoggingStreamName: {
    path: "/account/services/logging.stream.name",
    description: "SSM parameter containing the Name (not ARN) on the kinesis stream",
  },
  DistributionBucket: {
    path: "/account/services/artifact.bucket",
    description: "SSM parameter containing the S3 bucket name holding distribution artifacts",
  },
  AccessLoggingBucket: {
    path: "/account/services/access-logging/bucket",
    description: "S3 bucket to store your access logs",
  },
  ConfigurationBucket: {
    path: "/account/services/private.config.bucket",
    description: "SSM parameter containing the S3 bucket name holding the app's private configuration",
  },
  AlarmTopic: {
    path: "/account/services/alarm.topic.arn",
    description:
      "SSM parameter containing the ARN of an SNS topic to use for alarms. Alarms are for things that require an immediate response.",
  },
  NotificationTopic: {
    path: "/account/services/notification.topic.arn",
    description:
      "SSM parameter containing the ARN of an SNS topic to use for notifications. Unlike alarms, notifications do not require an immediate response. Note, if you are notifying from code directly then you are probably better off going via Anghammarad.",
  },
  PrimaryVpcId: {
    path: `${VPC_SSM_PARAMETER_PREFIX}/primary/id`,
    description: "Virtual Private Cloud to run EC2 instances within",
  },
  PrimaryVpcPrivateSubnets: {
    path: `${VPC_SSM_PARAMETER_PREFIX}/primary/subnets/private`,
    description: "A list of private subnets",
  },
  PrimaryVpcPublicSubnets: {
    path: `${VPC_SSM_PARAMETER_PREFIX}/primary/subnets/public`,
    description: "A list of public subnets",
  },
};
