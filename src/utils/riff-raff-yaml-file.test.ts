import { App } from "aws-cdk-lib";
import { GuStack } from "../constructs/core";
import { RiffRaffYamlFile } from "./riff-raff-yaml-file";

describe("The RiffRaffYamlFile class", () => {
  it("Should throw when there are missing stack definitions", () => {
    const app = new App();

    class MyApplicationStack extends GuStack {}
    class MyDatabaseStack extends GuStack {}

    new MyApplicationStack(app, "App-CODE-deploy", { stack: "deploy", stage: "CODE" });
    new MyApplicationStack(app, "App-PROD-deploy", { stack: "deploy", stage: "PROD" });
    new MyApplicationStack(app, "App-PROD-media-service", { stack: "media-service", stage: "PROD" });

    new MyDatabaseStack(app, "Database-CODE-deploy", { stack: "deploy", stage: "PROD" });

    expect(() => {
      new RiffRaffYamlFile(app);
    }).toThrowError("Unable to produce a working riff-raff.yaml file; missing 4 definitions");
  });

  it("Should throw if there is an unresolved region", () => {
    const app = new App();
    class MyApplicationStack extends GuStack {}
    new MyApplicationStack(app, "App-CODE-deploy", { stack: "deploy", stage: "CODE" });

    expect(() => {
      new RiffRaffYamlFile(app);
    }).toThrowError("Unable to produce a working riff-raff.yaml file; all stacks must have an explicit region set");
  });

  it("Should add a cloud-formation deployment", () => {
    const app = new App({ outdir: "/tmp/cdk.out" });
    class MyApplicationStack extends GuStack {}
    new MyApplicationStack(app, "App-PROD-deploy", { stack: "deploy", stage: "PROD", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFile(app).toYAML();

    // Not sure why we have the extra `"` characters...they don't appear in the resulting file on disk...
    expect(actual).toMatchInlineSnapshot(`
      "allowedStages:
        - PROD
      deployments:
        my-application-stack-cfn-deploy:
          type: cloud-formation
          regions:
            - eu-west-1
          stacks:
            - deploy
          app: my-application-stack
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              PROD: App-PROD-deploy.template.json
      "
      `);
  });
});
