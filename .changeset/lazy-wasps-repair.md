---
"@guardian/cdk": minor
---

feat(backup): Support backups provided by DevX

Adds a new property `withBackup` to `GuStack` to enable backups provided by DevX.

When `true`, all supported resources in the stack will receive a new tag `devx-backup-enabled`.

To opt in/out an individual resource, you can manually apply this tag.

See https://github.com/guardian/aws-backup.
