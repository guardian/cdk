const arnRegex = "arn:aws:[a-z0-9]*:[a-z0-9\\-]*:[0-9]{12}:.*";

const s3BucketRegex = "(?!^(\\d{1,3}\\.){3}\\d{1,3}$)(^[a-z0-9]([a-z0-9-]*(\\.[a-z0-9])?)*$(?<!\\-))";
const s3ArnRegex = `arn:aws:s3:::${s3BucketRegex}*`;

export const RegexPattern = {
  ARN: arnRegex,
  S3ARN: s3ArnRegex,
};
