---
"@guardian/cdk": major
---

ECS task now uses GuVpc.subnetsFromParameter rather than defaulting to CDK context

Note that this is a breaking change, because the previous behaviour was [this](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions_tasks.EcsRunTask.html#subnets)
 - which relied on a CDK context file with details of the different subnets.
