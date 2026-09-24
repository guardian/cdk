---
"@guardian/cdk": major
---

`GuStack` now fails synthesis when a stack breaches an [AWS Foundational Security Best Practices](https://docs.aws.amazon.com/securityhub/latest/userguide/fsbp-standard.html) control, using [cfn-guard](https://github.com/cdklabs/cdk-validator-cfnguard) rules from the [AWS Guard Rules Registry](https://github.com/aws-cloudformation/aws-guard-rules-registry). The controls checked are EC2.19, ES.2, KMS.5, Lambda.1, Opensearch.2, RDS.2, S3.2, S3.3, SNS.4 and SQS.3. This includes `cdk synth` and tests that synthesise the app, such as `Template.fromStack`. To accept a breach, acknowledge the reported rule, e.g. `Validations.of(bucket).acknowledge({ id: "FSBP::S3_BUCKET_PUBLIC_READ_PROHIBITED", reason: "..." })`.
