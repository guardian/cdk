---
"@guardian/cdk": major
---

Support generating multiple `riff-raff.yaml` files. To do this, set the `riffRaffProjectName` property of a `GuStack`.
This is helpful in a few scenarios, for example if you have a singleton (INFRA) stack, and CODE/PROD application stacks.

In the following, two files will be produced:
- `/path/to/cdk.out/deploy::core-infra/riff-raff.yaml`
- `/path/to/cdk.out/deploy::my-app/riff-raff.yaml`

```ts
class MyCoreInfraStack extends GuStack {}
class MyApplicationStack extends GuStack {}

new MyCoreInfraStack(app, "MyCoreInfra", {
  stack: "deploy",
  stage: "INFRA",
  env: { region: "eu-west-1" },
  riffRaffProjectName: "deploy::core-infra",
});

new MyApplicationStack(app, "MyApp-CODE", {
  stack: "deploy",
  stage: "CODE",
  env: { region: "eu-west-1" },
  riffRaffProjectName: "deploy::my-app",
});

new MyApplicationStack(app, "MyApp-PROD", {
  stack: "deploy",
  stage: "PROD",
  env: { region: "eu-west-1" },
  riffRaffProjectName: "deploy::my-app",
});
```

BREAKING CHANGE: Within `RiffRaffYamlFile` the `riffRaffYaml` property has been removed.
NOTE: If you're using `GuRoot`, this change should not impact you.

To migrate, use the `configuration` property:

```ts
// BEFORE
const app = new App();
const riffRaff = new RiffRaffYamlFile(app);
const deployments = riffRaff.riffRaffYaml.deployments;

const myStack = new MyStack(app, "my-stack", {
  stack: "playground",
  stage: "PROD",
  env: { region: "eu-west-1" },
  riffRaffProjectName: "playground::my-stack",
});

deployments.set("additional-deployment", {
  type: "aws-s3",
  ...
});

// AFTER
const app = new App();
const riffRaff = new RiffRaffYamlFile(app);
const { configuration } = riffRaff;

configuration.get("playground::my-stack")?.deployments.set("additional-deployment", {
  type: "aws-s3",
  ...
});
```
