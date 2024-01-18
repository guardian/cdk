---
"@guardian/cdk": patch
---

Remove direct dependencies that should be peer ones:
- `aws-cdk-lib`
- `constructs`

No change for consumers that provide compatible packages
