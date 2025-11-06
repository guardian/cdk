---
"@guardian/cdk": patch
---

The new deployment mechanism (`GuEc2AppExperimental`) now suspends some additional ASG processes:

`AZRebalance`
`InstanceRefresh`
`ReplaceUnhealthy`
`ScheduledActions`
`HealthCheck`

https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-suspend-resume-processes.html#process-types

This follows a recommendation from AWS and should make deployments (and rollbacks) more reliable:
https://repost.aws/knowledge-center/auto-scaling-group-rolling-updates
