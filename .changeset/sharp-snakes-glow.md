---
"@guardian/cdk": minor
---

Improves the safety of the new deployment mechanism for services which scale horizontally.

As part of this the `default` and `maxValue` properties of the `MinInstancesInServiceFor<app>` parameter (which is used by Riff-Raff) have been removed.
