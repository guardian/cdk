export interface SsmParameterPath {
  path: string;
  description: string;
  optional?: boolean;

  // Recommended naming convention for target resource, such as an S3 bucket.
  // $account is substituted as the account name.
  namingPattern?: string;
}

interface NamedSsmParameterPaths {
  Anghammarad: SsmParameterPath;
  LoggingStreamName: SsmParameterPath;
  DistributionBucket: SsmParameterPath;
  AccessLoggingBucket: SsmParameterPath;
  ConfigurationBucket: SsmParameterPath;
  PrimaryVpcId: SsmParameterPath;
  PrimaryVpcPrivateSubnets: SsmParameterPath;
  PrimaryVpcPublicSubnets: SsmParameterPath;
  FastlyCustomerId: SsmParameterPath;
  DevxGlobalDistBucket: SsmParameterPath;
}

export const VPC_SSM_PARAMETER_PREFIX = "/account/vpc";

export const NAMED_SSM_PARAMETER_PATHS: NamedSsmParameterPaths = {
  Anghammarad: {
    path: "/account/services/anghammarad.topic.arn",
    description: "SSM parameter containing the ARN of the Anghammarad SNS topic",
    optional: true,
  },
  LoggingStreamName: {
    path: "/account/services/logging.stream.name",
    description: "SSM parameter containing the Name (not ARN) on the kinesis stream",
  },
  DistributionBucket: {
    path: "/account/services/artifact.bucket",
    description: "SSM parameter containing the S3 bucket name holding distribution artifacts",
    namingPattern: "com-gu-$account-artifacts",
  },
  AccessLoggingBucket: {
    path: "/account/services/access-logging/bucket",
    description: "S3 bucket to store your access logs",
  },
  ConfigurationBucket: {
    path: "/account/services/private.config.bucket",
    description: "SSM parameter containing the S3 bucket name holding the app's private configuration",
    namingPattern: "com-gu-$account-configs",
  },
  PrimaryVpcId: {
    path: `${VPC_SSM_PARAMETER_PREFIX}/primary/id`,
    description: "Virtual Private Cloud to run EC2 instances within. Should NOT be the account default VPC.",
  },
  PrimaryVpcPrivateSubnets: {
    path: `${VPC_SSM_PARAMETER_PREFIX}/primary/subnets/private`,
    description: "A comma-separated list of private subnets",
  },
  PrimaryVpcPublicSubnets: {
    path: `${VPC_SSM_PARAMETER_PREFIX}/primary/subnets/public`,
    description: "A comma-separated list of public subnets",
  },
  DevxGlobalDistBucket: {
    path: "/organisation/services/artifact.bucket",
    description: "SSM parameter containing the S3 bucket name holding organisation-level DevX artifacts",
  },
  FastlyCustomerId: {
    path: "/account/external/fastly/customer.id",
    description:
      "SSM parameter containing the Fastly Customer ID. Can be obtained from https://manage.fastly.com/account/company by an admin",
    optional: true,
  },
};

export const ALL_SSM_PARAMETER_PATHS: SsmParameterPath[] = Object.values(
  NAMED_SSM_PARAMETER_PATHS
) as SsmParameterPath[];
