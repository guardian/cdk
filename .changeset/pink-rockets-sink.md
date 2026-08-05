---
"@guardian/cdk": minor
---

Changes the stem of the logical ID fo the target group created for ECS in the `GuLoadBalancedAppExperimental` pattern.

A target group has the following restrictions on its [name](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-elasticloadbalancingv2-targetgroup.html#cfn-elasticloadbalancingv2-targetgroup-name):
- Max 32 characters
- Must be regionally unique in an account

The former can be checked at compile time. The latter is only checked at deploy time. For this reason, we let CloudFormation auto-generate a name. The algorithm used to generate a name appears to be: first 6 alphanumeric characters of CloudFormation stack name, first 6 alphanumeric characters of logical ID, 12 character GUID.
Our CloudFormation stack names typically take the form `<stack>-<stage><app>`, for example `deploy-CODE-cdk-playground` or `deploy-PROD-prism`. For these stacks, the ECS target groups have names like `deploy-EcsTar-123456123456` and `deploy-EcsTar-123456123457`; it isn't possible to know which app these relate to at a glance.

With this change, the target group will have a logical ID stem of `MyAppEcsTargetGroup`, resulting in a name such as `deploy-MyAppE-123456123456`.

## Why not change all target groups?
We should consider target groups as a [stateful resource](../docs/stateful-resources.md) as they're tied to metrics used to understand the performance of an application.
Changing all target groups (e.g. the ones created for EC2 apps via the `GuEc2App` pattern) would be a significant breaking change.

The ECS infrastructure created by the `GuLoadBalancedAppExperimental` pattern is not yet used in production, so we can afford to make this destructive change in this context.
