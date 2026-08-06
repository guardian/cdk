---
"@guardian/cdk": minor
---

Changes the stem of the logical ID for the target group created for ECS in the `GuLoadBalancedAppExperimental` pattern. This results in a more a slightly more human-readable name.

For example, say we have a CloudFormation stack called `deploy-CODE-cdk-playground`, previously the target group name would be `deploy-EcsTar-123456123456`, now it will be `deploy-Cdkpl-123456123456`.

NOTE: As this is a change to an experimental pattern, it is not considered a breaking change even though it results in recreating a [stateful resource](../docs/stateful-resources.md).
