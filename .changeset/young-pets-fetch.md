---
"@guardian/cdk": major
---

Add support for the scenario where we create a singleton stack for shared infrastructure
alongside application stacks.
For example, a singleton stack that provisions an Elastic Container Registry,
and a CODE and PROD application stack that pulls images from the registry.

Previously, we had to create work-arounds with multiple `App`s.

BREAKING CHANGE: `RiffRaffYamlFile` can no longer be directly instantiated
Instead of directly instantiating `RiffRaffYamlFile`, please use `RiffRaffYamlFile.fromApp`:

```ts
// Before
const app = new App();
new RiffRaffYamlFile(app);

// After
const app = new App();
RiffRaffYamlFile.fromApp(app);
```
