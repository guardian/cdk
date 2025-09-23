---
"@guardian/cdk": major
---

Access logging for Application Load Balancers (ALBs) enabled by default.

The optional `accessLogging` object property has been removed from the `GuEc2App` and `GuEc2AppExperimental` patterns.
There is now an optional boolean property `withAccessLogging` which defaults to `true`.
A `withAccessLogging` property is also added to the `GuApplicationLoadBalancer` construct.

When `true` an ALB will be configured to write access logs to the account's S3 bucket with a set prefix for compatibility with the Athena database created in https://github.com/guardian/aws-account-setup.
To disable access logging, set `withAccessLogging` to `false`.
