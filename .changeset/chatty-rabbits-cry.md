---
"@guardian/cdk": minor
---

feat(riff-raff.yaml): Support cross stack dependencies

Currently the `riff-raff.yaml` generator is not able to create dependencies between `cloud-formation` deployments. This means each `cloud-formation` deployment could happen at the same time.

This does not work in the scenario where we have:
- Stack A containing a bucket
- Stack B CODE containing an app that uses A's bucket
- Stack B PROD containing an app that uses A's bucket

That is, we can't guarantee Stack A is deployed first.

In this change we add support for the scenario where we have a shared resources stack.
The generated `riff-raff.yaml` file will describe that Stack B CODE, and Stack B PROD depend on Stack A.

It uses the AWS CDK mechanism https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Stack.html#addwbrdependencytarget-reason.
