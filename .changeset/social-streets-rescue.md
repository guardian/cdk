---
"@guardian/cdk": patch
---

fix(GuEcsTaskProps): Change type of `containerInsights` property from `boolean` to `ContainerInsights`.

This enables support of enhanced ECS monitoring and addresses an AWS CDK deprecation warning.
