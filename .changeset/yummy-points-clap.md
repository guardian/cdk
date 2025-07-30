---
"@guardian/cdk": patch
---

Remove unused `RegexPattern.S3ARN`.

The regex isn't used (other than within tests of this repository), so we can safely remove it.
