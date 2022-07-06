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
});
