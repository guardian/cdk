---
"@guardian/cdk": minor
---

Support customised output directory for `riff-raff.yaml` file to support repositories that deploy multiple Riff-Raff projects.

Example usage:

```ts
import { RiffRaffYamlFile } from "./index";

const appForInfra = new App();

const myInfraStack = new MyInfraStack(appForInfra, "my-infra-stack", {
  stack: "playground",
  stage: "INFRA",
  env: { region: "eu-west-1" },
});

const appForMyApp = new App();

const myAppStackCODE = new MyAppStack(appForMyApp, "my-stack-CODE", {
  stack: "playground",
  stage: "CODE",
  env: { region: "eu-west-1" },
});
const myAppStackPROD = new MyAppStack(appForMyApp, "my-stack-PROD", {
  stack: "playground",
  stage: "CODE",
  env: { region: "eu-west-1" },
});

new RiffRaffYamlFile(appForInfra, "playground::core-infra"); // Generates a file to `cdk.out/playground::core-infra/riff-raff.yaml`
new RiffRaffYamlFile(appForMyApp, "playground::my-app"); // Generates a file to `cdk.out/playground::my-app/riff-raff.yaml`
```
