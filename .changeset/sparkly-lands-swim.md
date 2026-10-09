---
"@guardian/cdk": patch
---

Add optional `allowS3Sync` boolean (default `false`) to `GuLoadBalancedAppExperimental` pattern to add permissions necessary to use `aws s3 sync` in EC2 user-data blocks.
