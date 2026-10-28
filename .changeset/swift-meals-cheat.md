---
"@guardian/cdk": minor
---

Change @guardian/cdk to explicit exports.

```ts
/// Before
import { GuStack } from "@guardian/cdk/lib/constructs/core";
import { GuAutoscalingGroup } from "@guardian/cdk/lib/constructs/autoscaling";
/// After
import { GuStack } from "@guardian/cdk";
import { GuAutoscalingGroup } from "@guardian/cdk/autoscaling";
```

All previosuly available exports under `@guardian/cdk/lib` are available, but will eventually be removed.
