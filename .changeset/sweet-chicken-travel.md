---
"@guardian/cdk": major
---

Implement `GuParameterStoreReadPolicy` as a singleton to support `GuLoadBalancedAppExperimental` instantiating it once for the EC2 app and once for the ECS app.
The result is a single `AWS::IAM::Policy` resource in the CloudFormation template, which is attached to both the EC2 and ECS roles, keeping the diff small.

A [GitHub search](https://github.com/search?q=org%3Aguardian+GuParameterStoreReadPolicy+NOT+repo%3Aguardian%2Fcdk++NOT+is%3Aarchived&type=code) shows `GuParameterStoreReadPolicy` is never directly instantiated by clients.
