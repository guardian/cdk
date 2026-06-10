---
"@guardian/cdk": minor
---

Support pulling images across accounts

Currently, we have a central ECR registry in the DeployTools account.
This change updates how we reference an image, by using the ARN of the registry to support running an ECS service in another account.
