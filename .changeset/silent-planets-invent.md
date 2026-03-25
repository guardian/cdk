---
"@guardian/cdk": patch
---

Correctly validate stack existence when instantiating a `RiffRaffYamlFile` to generate `riff-raff.yaml`.

Given the below set of stacks, an `Error` will now be thrown as there is a missing instance of `MyDatabaseStack` for `CODE`.

```typescript
new MyApplicationStack(app, "App-CODE-deploy", {
  env: {
    region: "eu-west-1",
  },
  stack: "deploy",
  stage: "CODE",
});
new MyApplicationStack(app, "App-PROD-deploy", {
  env: {
    region: "eu-west-1",
  },
  stack: "deploy",
  stage: "PROD",
});

new MyDatabaseStack(app, "Database-PROD-deploy", {
  env: {
    region: "eu-west-1",
  },
  stack: "deploy",
  stage: "PROD",
});
```

Previously, the validation would incorrectly pass.

<details><summary>Invalid `riff-raff.yaml`</summary>
<p>

```yaml
allowedStages:
  - CODE
  - PROD
deployments:
  cfn-eu-west-1-deploy-my-application-stack:
    type: cloud-formation
    regions:
      - eu-west-1
    stacks:
      - deploy
    app: my-application-stack
    contentDirectory: /private/var/folders/0_/pvjwppsx5cl19t4n6_rmm_y80000gp/T/cdk.out9xIUJu
    parameters:
      templateStagePaths:
        CODE: App-CODE-deploy.template.json
        PROD: App-PROD-deploy.template.json
  cfn-eu-west-1-deploy-my-database-stack:
    type: cloud-formation
    regions:
      - eu-west-1
    stacks:
      - deploy
    app: my-database-stack
    contentDirectory: /private/var/folders/0_/pvjwppsx5cl19t4n6_rmm_y80000gp/T/cdk.out9xIUJu
    parameters:
      templateStagePaths:
        PROD: Database-PROD-deploy.template.json
```

</p>
</details>
