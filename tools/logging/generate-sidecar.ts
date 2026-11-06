/**
 * Writes the logging sidecar settings used by GuCDK to `config/sidecar.json`, so the Go integration test and the manual
 * testing scripts run the sidecar exactly as ECS does.
 *
 * Run with `script/generate-logging-sidecar` or `npm run generate:logging-sidecar`.
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import {
  LOGGING_SIDECAR_COMMAND,
  LOGGING_SIDECAR_ENVIRONMENT,
  LOGGING_SIDECAR_IMAGE,
} from "../../src/experimental/patterns/logging-sidecar";

const configDir = join(__dirname, "config");
const outputFile = join(configDir, "sidecar.json");

const sidecar = {
  image: LOGGING_SIDECAR_IMAGE,
  command: LOGGING_SIDECAR_COMMAND,
  environment: LOGGING_SIDECAR_ENVIRONMENT,
};

mkdirSync(configDir, { recursive: true });
writeFileSync(outputFile, `${JSON.stringify(sidecar, null, 2)}\n`);

console.log(`Wrote ${outputFile}`);
