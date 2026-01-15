---
"@guardian/cdk": patch
---

Adds an Owner tag for the auth-lambda, so that teams auditing their Lambda functions can more easily understand who is responsible for maintaining this Lambda.

This Lambda is maintained by DevX as part of https://github.com/guardian/cognito-auth-lambdas.

If your EC2 application uses the `googleAuth` feature then you will need to update your snapshots to accept this change.
