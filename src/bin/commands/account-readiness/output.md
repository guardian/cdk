# Output changes

## Current output (for discussion)

AWS account has 0/8 SSM parameters in region eu-west-1

Missing required parameters:
❌ /account/services/anghammarad.topic.arn (SSM parameter containing the ARN of the Anghammarad SNS topic)
❌ /account/services/logging.stream.name (SSM parameter containing the Name (not ARN) on the kinesis stream)
❌ /account/services/artifact.bucket (SSM parameter containing the S3 bucket name holding distribution artifacts)
❌ /account/services/access-logging/bucket (S3 bucket to store your access logs)
❌ /account/services/private.config.bucket (SSM parameter containing the S3 bucket name holding the app's private configuration)
❌ /account/vpc/primary/id (Virtual Private Cloud to run EC2 instances within)
❌ /account/vpc/primary/subnets/private (A list of private subnets)
❌ /account/vpc/primary/subnets/public (A list of public subnets)

AWS account requires the above 8 SSM parameters to work with @guardian/cdk v33.2.3

VPC Summary
❌ Expected to find 3 SSM Parameters (3 per in use VPC) but found 0
┌─────────┬─────────────────────────┬─────────────┬─────────────────┬───────┬───────────────────┐
│ (index) │ VpcId │ Region │ IsAwsDefaultVpc │ InUse │ CidrBlock │
├─────────┼─────────────────────────┼─────────────┼─────────────────┼───────┼───────────────────┤
│ 0 │ 'vpc-5955933c' │ 'eu-west-1' │ false │ true │ '10.248.144.0/22' │
│ 1 │ 'vpc-09429c22c90552e97' │ 'eu-west-1' │ true │ false │ '172.31.0.0/16' │
└─────────┴─────────────────────────┴─────────────┴─────────────────┴───────┴───────────────────┘

Default VPC checks
✅ The default VPC is not in use in eu-west-1 and is not referenced by any SSM Parameters. No action needed.

## Issues

- VPC summary is confusing/overlaps with parameter output
- doesn't explain what failures mean in detail/how to fix/next steps
- does every VPC need parameters?

## Suggested changes

Create an `account-readiness -fix` flag to prompt creation of parameters.

### Success message

Status: SUCCESS ✅

Account `account` has the required parameters and VPC setup.

✅ /account/services/anghammarad.topic.arn
...

### Fail message (missing some params)

Status: FAIL ❌
Reason: Missing required parameters

Explanation: @guardian/cdk works by convention; our patterns and constructs
expect certain paths in Parameter Store to exist. For example, patterns will, by
default, ship logs to the Kinesis stream defined at
`/account/services/logging.stream.name`. If you use patterns and constructs
without first setting these parameters you may encounter errors when deploying
your @guardian/cdk Cloudformation stacks.

The missing parameters and descriptions are listed below. Add these to Parameter
Store in your AWS account and re-run the `account-readiness` command to verify.

We recommend Cloudforming these parameters and committing them to version
control.

Missing parameters are:

/account/services/anghammarad.topic.arn
SSM parameter containing the ARN of the Anghammarad SNS topic. See also:
[anghammarad repo].

### Fail message (not bootstrapped)

Status: FAIL ❌
Reason(s): Account not bootstrapped

It looks like account [account] has not been bootstrapped for CDK. Run the
`bootstrap` command to get started.
