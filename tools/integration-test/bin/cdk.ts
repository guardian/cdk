import "source-map-support/register";
import { App } from "aws-cdk-lib";
import { IntegrationTestStack } from "../src/integration-test-stack";

const app = new App();
new IntegrationTestStack(app, "IntegrationTestStackPROD", { stack: "integration-test", stage: "PROD" });
