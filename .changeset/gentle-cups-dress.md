---
"@guardian/cdk": major
---

Use PROD version of cognito-auth-lambdas instead of INFRA.

We no longer update/use the INFRA version of cognito-auth-lambdas, although we won't be making any breaking changes to these lambdas there may be a situation if a user of CDK does not update for a long while, when they switch from INFRA to PROD they will suddenly receive a lot of updates to their lambdas.

Users should take care to verify that any applications use Google Auth are still functional.
