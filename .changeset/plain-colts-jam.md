---
"@guardian/cdk": minor
---

Update the `GuParameterStoreReadPolicy` construct to remove the hard-coded `PolicyName` property.
This allows the `GuParameterStoreReadPolicy` singleton to be instantiated multiple times in a single `GuStack` when there are multiple apps.
