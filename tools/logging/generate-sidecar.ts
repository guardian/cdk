/**
 * Writes the logging sidecar settings used by GuCDK to `config/sidecar.json`, so the Go integration test and the manual
 * testing scripts run the sidecar exactly as ECS does.
 *
 * Run with `script/generate-logging-sidecar` or `npm run generate:logging-sidecar`.
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import type { LoggingSidecarIdentity } from "../../src/experimental/patterns/logging-sidecar";
import {
  LOGGING_SIDECAR_COMMAND,
  LOGGING_SIDECAR_IMAGE,
  loggingSidecarEnvironment,
} from "../../src/experimental/patterns/logging-sidecar";

const configDir = join(__dirname, "config");
const outputFile = join(configDir, "sidecar.json");

// GuCDK writes the application identity into the Fluent Bit config. The tests check that records are enriched with it.
const identity: Required<LoggingSidecarIdentity> = {
  stack: "test-stack",
  stage: "TEST",
  app: "test-app",
  repositoryName: "guardian/test-repo",
};

const sidecar = {
  image: LOGGING_SIDECAR_IMAGE,
  command: LOGGING_SIDECAR_COMMAND,
  environment: loggingSidecarEnvironment(identity),
  identity,
};

mkdirSync(configDir, { recursive: true });
writeFileSync(outputFile, `${JSON.stringify(sidecar, null, 2)}\n`);

console.log(`Wrote ${outputFile}`);
