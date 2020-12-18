import { App } from "@aws-cdk/core";
import { GuStack } from "../../src/constructs/core";

export const simpleGuStackForTesting: () => GuStack = () => new GuStack(new App(), "Test", { app: "testing" });
