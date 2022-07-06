import { App } from "aws-cdk-lib";
import { GuStack } from "../../constructs/core";
import { RiffRaffYamlFileExperimental } from "./index";

describe("The RiffRaffYamlFile class", () => {
  it("Should throw when there are missing stack definitions", () => {
    const app = new App();

    class MyApplicationStack extends GuStack {}
    class MyDatabaseStack extends GuStack {}

    const region = {
      env: {
        region: "eu-west-1",
      },
    };

    new MyApplicationStack(app, "App-CODE-deploy", { ...region, stack: "deploy", stage: "CODE" });
    new MyApplicationStack(app, "App-PROD-media-service", {
      ...region,
      stack: "media-service",
      stage: "PROD",
    });

    new MyApplicationStack(app, "App-PROD-deploy", { ...region, stack: "deploy", stage: "PROD" });
    new MyDatabaseStack(app, "Database-CODE-deploy", { ...region, stack: "deploy", stage: "PROD" });

    expect(() => {
      new RiffRaffYamlFileExperimental(app);
    }).toThrowError("Unable to produce a working riff-raff.yaml file; missing 4 definitions");
  });

  it("Should throw if there is an unresolved region", () => {
    const app = new App();
    class MyApplicationStack extends GuStack {}
    new MyApplicationStack(app, "App-CODE-deploy", { stack: "deploy", stage: "CODE" });

    expect(() => {
      new RiffRaffYamlFileExperimental(app);
    }).toThrowError("Unable to produce a working riff-raff.yaml file; all stacks must have an explicit region set");
  });

  it("Should add a cloud-formation deployment", () => {
    const app = new App({ outdir: "/tmp/cdk.out" });
    class MyApplicationStack extends GuStack {}
    new MyApplicationStack(app, "App-PROD-deploy", { stack: "deploy", stage: "PROD", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFileExperimental(app).toYAML();

    // Not sure why we have the extra `"` characters...they don't appear in the resulting file on disk...
    expect(actual).toMatchInlineSnapshot(`
      "allowedStages:
        - PROD
      deployments:
        cfn-eu-west-1-deploy-my-application-stack:
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

  it("Should add a cloud-formation deployment with multiple stages", () => {
    const app = new App({ outdir: "/tmp/cdk.out" });
    class MyApplicationStack extends GuStack {}
    new MyApplicationStack(app, "App-PROD-deploy", { stack: "deploy", stage: "PROD", env: { region: "eu-west-1" } });
    new MyApplicationStack(app, "App-CODE-deploy", { stack: "deploy", stage: "CODE", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFileExperimental(app).toYAML();

    expect(actual).toMatchInlineSnapshot(`
      "allowedStages:
        - PROD
        - CODE
      deployments:
        cfn-eu-west-1-deploy-my-application-stack:
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
              CODE: App-CODE-deploy.template.json
      "
    `);
  });

  it("Should add a cloud-formation deployment with multiple stages and regions", () => {
    const app = new App({ outdir: "/tmp/cdk.out" });
    class MyApplicationStack extends GuStack {}
    new MyApplicationStack(app, "App-PROD-deploy-eu-west-1", {
      stack: "deploy",
      stage: "PROD",
      env: { region: "eu-west-1" },
    });
    new MyApplicationStack(app, "App-CODE-deploy-eu-west-1", {
      stack: "deploy",
      stage: "CODE",
      env: { region: "eu-west-1" },
    });

    new MyApplicationStack(app, "App-PROD-deploy-us-east-1", {
      stack: "deploy",
      stage: "PROD",
      env: { region: "us-east-1" },
    });
    new MyApplicationStack(app, "App-CODE-deploy-us-east-1", {
      stack: "deploy",
      stage: "CODE",
      env: { region: "us-east-1" },
    });

    const actual = new RiffRaffYamlFileExperimental(app).toYAML();

    expect(actual).toMatchInlineSnapshot(`
      "allowedStages:
        - PROD
        - CODE
      deployments:
        cfn-eu-west-1-deploy-my-application-stack:
          type: cloud-formation
          regions:
            - eu-west-1
          stacks:
            - deploy
          app: my-application-stack
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              PROD: App-PROD-deploy-eu-west-1.template.json
              CODE: App-CODE-deploy-eu-west-1.template.json
        cfn-us-east-1-deploy-my-application-stack:
          type: cloud-formation
          regions:
            - us-east-1
          stacks:
            - deploy
          app: my-application-stack
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              PROD: App-PROD-deploy-us-east-1.template.json
              CODE: App-CODE-deploy-us-east-1.template.json
      "
    `);
  });
});
