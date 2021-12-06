const accountId = "[0-9]{12}";

// see https://docs.aws.amazon.com/organizations/latest/APIReference/API_Organization.html
const organisationId = "o-[a-z0-9]{10,32}";

const arnRegex = `arn:aws:[a-z0-9]*:[a-z0-9\\-]*:${accountId}:.*`;

const s3BucketRegex = "(?!^(\\d{1,3}\\.){3}\\d{1,3}$)(^[a-z0-9]([a-z0-9-]*(\\.[a-z0-9])?)*$(?<!\\-))";
const s3ArnRegex = `arn:aws:s3:::${s3BucketRegex}*`;

const emailRegex = "^[a-zA-Z]+(\\.[a-zA-Z]+)*@theguardian.com$";

// TODO be more strict on region?
const acmRegex = `arn:aws:acm:[0-9a-z\\-]+:${accountId}:certificate/[0-9a-z\\-]+`;

export const RegexPattern = {
  ACCOUNT_ID: `^${accountId}$`,
  ORGANISATION_ID: `^${organisationId}$`,
  ARN: arnRegex,
  S3ARN: s3ArnRegex,
  GUARDIAN_EMAIL: emailRegex,
  ACM_ARN: acmRegex,
};
