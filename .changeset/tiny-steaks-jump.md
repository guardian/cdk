---
"@guardian/cdk": major
---

BREAKING CHANGE: DevX Backups can no longer be enabled via the `withBackup` prop, which has been removed.

Users should now opt-in/out of DevX Backups at the construct level (i.e. when defining an RDS instance, cluster or
DynamoDB table).

We recommend using the `GuDatabaseInstance` or `GuDynamoTable` to help with this. If these constructs cannot be used,
resources can also be tagged like this: `Tags.of(myDatabase).add("devx-backup-enabled", "true")`.
