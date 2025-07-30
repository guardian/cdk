const arnRegex = "arn:aws:[a-z0-9]*:[a-z0-9\\-]*:[0-9]{12}:.*";

// TODO be more strict on region?
const acmRegex = "arn:aws:acm:[0-9a-z\\-]+:[0-9]{12}:certificate/[0-9a-z\\-]+";

export const RegexPattern = {
  ARN: arnRegex,
  ACM_ARN: acmRegex,
};
