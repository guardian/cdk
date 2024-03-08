---
"@guardian/cdk": patch
---

Fixes a bug where `this.app` on a `GuStack` is always `undefined`, as it is never set.

See https://github.com/guardian/cdk/pull/1497#issuecomment-1480997050.
