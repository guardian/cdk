---
"@guardian/cdk": major
---

`GuStack` now fails synthesis when a stack breaches an [AWS Foundational Security Best Practices](https://docs.aws.amazon.com/securityhub/latest/userguide/fsbp-standard.html) control, using [cfn-guard](https://github.com/cdklabs/cdk-validator-cfnguard) rules from the [AWS Guard Rules Registry](https://github.com/aws-cloudformation/aws-guard-rules-registry). The only control currently checked is S3.3. This includes `cdk synth` and tests that synthesise the app, such as `Template.fromStack`. To accept a breach, acknowledge the reported rule, e.g. `Validations.of(bucket).acknowledge({ id: "FSBP::S3_BUCKET_PUBLIC_WRITE_PROHIBITED", reason: "..." })`.
