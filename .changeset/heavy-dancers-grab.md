---
"@guardian/cdk": patch
---

Explicitly add the `App` tag to all resources created by `GuLoadBalancedAppExperimental`. Namely, `App` is added to:
- `AWS::ECS::Cluster`
- `AWS::ECS::TaskDefinition`
- `AWS::ECS::Service`

Previously, these resources implicitly inherited the `App` tag of the parent CloudFormation stack.
The CloudFormation's `App` tag is implicitly set by Riff-Raff via the contents of the `riff-raff.yaml` configuration.
