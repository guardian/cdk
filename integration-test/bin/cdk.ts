import "source-map-support/register";
import { App } from "@aws-cdk/core";
import { IntegrationTestStack } from "../src/integration-test-stack";

const app = new App();
new IntegrationTestStack(app, "IntegrationTestStackCODE", { stack: "integration-test-CODE" });
new IntegrationTestStack(app, "IntegrationTestStackPROD", { stack: "integration-test-PROD" });
