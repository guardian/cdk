const arnRegex = "arn:aws:[a-z0-9]*:[a-z0-9\\-]*:[0-9]{12}:.*";

const s3BucketRegex = "(?!^(\\d{1,3}\\.){3}\\d{1,3}$)(^[a-z0-9]([a-z0-9-]*(\\.[a-z0-9])?)*$(?<!\\-))";
const s3ArnRegex = `arn:aws:s3:::${s3BucketRegex}*`;

// TODO be more strict on region?
const acmRegex = "arn:aws:acm:[0-9a-z\\-]+:[0-9]{12}:certificate/[0-9a-z\\-]+";

export const RegexPattern = {
  ARN: arnRegex,
  S3ARN: s3ArnRegex,
  ACM_ARN: acmRegex,
};
