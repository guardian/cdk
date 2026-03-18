---
"@guardian/cdk": patch
---

Correctly add `minInstancesInServiceParameters` to a generated `riff-raff.yaml` file.

The following experimental classes have an API change:
- `GuAutoScalingRollingUpdateTimeoutExperimental`
- `GuHorizontallyScalingDeploymentPropertiesExperimental`

Specifically, they are no longer implemented as singletons. This means they're now instantiated differently:

```typescript
declare const stack: GuStack;

// Before
Aspects.of(stack).add(GuAutoScalingRollingUpdateTimeoutExperimental.getInstance(stack));
Aspects.of(stack).add(GuHorizontallyScalingDeploymentPropertiesExperimental.getInstance(stack));

// Now
Aspects.of(stack).add(new GuAutoScalingRollingUpdateTimeoutExperimental);
Aspects.of(stack).add(new GuHorizontallyScalingDeploymentPropertiesExperimental());
```

NOTE: It is important to instantiate `GuAutoScalingRollingUpdateTimeoutExperimental` only once per `GuStack` to avoid incorrectly updating resources multiple times.
To do this, either instantiate it in the constructor of your `GuStack`. Alternatively, check if it is present in the stack's aspects before adding it:

```typescript
declare const stack: GuStack;

const allAspects = Aspects.of(stack).all;

const maybeRollingUpdateTimeoutAspect = allAspects.find(
  (_) => _ instanceof GuAutoScalingRollingUpdateTimeoutExperimental,
);
if (!maybeRollingUpdateTimeoutAspect) {
  Aspects.of(stack).add(new GuAutoScalingRollingUpdateTimeoutExperimental());
}
```
