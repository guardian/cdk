import "source-map-support/register";
import { App } from "@aws-cdk/core";
import { IntegrationTestStack } from "../src/integration-test-stack";

const app = new App();
new IntegrationTestStack(app, "Cdk", { stack: "integration-test" });
