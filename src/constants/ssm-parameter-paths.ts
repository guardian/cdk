export interface SsmParameterPath {
  path: string;
  description: string;
  optional?: boolean;
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
  FastlyCustomerId: {
    path: "/account/external/fastly/customer.id",
    description: "SSM parameter containing the Fastly Customer ID",
    optional: true,
  },
};
