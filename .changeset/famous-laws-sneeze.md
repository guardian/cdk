---
"@guardian/cdk": minor
---

Apply `additionalPolicies` to ECS task role created for `GuLoadBalancedAppExperimental` so the ECS task role inherits any custom permissions needed to run the application.
These are already applied to the EC2 instance role.
