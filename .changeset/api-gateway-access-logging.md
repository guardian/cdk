---
"@guardian/cdk": major
---

Enable access logging by default for the automatically deployed stages in `GuApiLambda` and `GuApiGatewayWithLambdaByPath`. Each API uses a Firehose delivery stream to write logs to the account bucket referenced by `/account/services/access-logging/bucket`, and creates an IAM role and CloudWatch delivery error logs.

Accounts must have a compatible access-log bucket and deployment permissions before enabling the defaults. Set the top-level `withAccessLogging: false` property to opt out. Explicit access-log destinations and formats are preserved. See the API migration guide for account prerequisites and the separate Athena setup.
