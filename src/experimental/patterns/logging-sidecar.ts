/**
 * Configuration for the FireLens log router sidecar used by `GuLoadBalancedAppExperimental`.
 *
 * The sidecar runs the stock AWS for Fluent Bit init image. Guardian's Fluent Bit config is passed in as environment
 * variables and written to the writable `/tmp` volume at startup, before handing over to the image's own entrypoint.
 * With a read-only root filesystem the init process writes its generated config to `/tmp/init/`.
 *
 * This file is the single source of truth for the sidecar. `script/generate-logging-sidecar` writes these values to
 * `tools/logging/config/sidecar.json`, so the logging integration test can run the sidecar exactly as ECS does.
 *
 * @see https://github.com/aws/aws-for-fluent-bit/blob/mainline/use_cases/init-process-for-fluent-bit/README.md
 */
import { Token } from "aws-cdk-lib";

/**
 * The digest of the AWS for Fluent Bit image. Every log record includes it in the `gu:logging-sidecar` field, so it's
 * possible to tell which sidecar image shipped a given record when debugging.
 */
export const LOGGING_SIDECAR_IMAGE_DIGEST = "sha256:0aa2921b14e44b8f00e057c68a0a3bafb944261a1c5aac36362bf2e1be8bef4d";

export const LOGGING_SIDECAR_IMAGE = `public.ecr.aws/aws-observability/aws-for-fluent-bit:init-3.4.11@${LOGGING_SIDECAR_IMAGE_DIGEST}`;

export const LOGGING_SIDECAR_WRITABLE_PATH = "/tmp";

export const LOGGING_SIDECAR_COMMAND = [
  "/bin/bash",
  "-c",
  [
    "mkdir -p /tmp/guardian",
    // Write each env var's contents verbatim to a file, with a trailing newline. Unlike `echo`, `printf '%s'` doesn't
    // interpret backslashes or a leading `-`, and the quoted variable keeps its line breaks.
    `printf '%s\\n' "$GU_FLUENT_BIT_PARSERS" > /tmp/guardian/guardian-parsers.conf`,
    `printf '%s\\n' "$GU_FLUENT_BIT_CONFIG" > /tmp/guardian/guardian.conf`,
    "exec /init/fluent_bit_init_entrypoint.sh",
  ].join(" && "),
];

export const GUARDIAN_FLUENT_BIT_PARSERS = `
[PARSER]
    Name json
    Format json
    Time_Key time
    Time_Format %Y-%m-%dT%H:%M:%SZ`;

/**
 * The application identity added to every log record shipped by the sidecar.
 */
export interface LoggingSidecarIdentity {
  stack: string;
  stage: string;
  app: string;
  repositoryName?: string;
}

/**
 * Values are written directly into Fluent Bit config, where whitespace would split them and `${...}` would be treated
 * as an environment variable. They are also known at synth time, so unresolved tokens are not supported.
 */
function validateIdentityValue(name: string, value: string): void {
  if (Token.isUnresolved(value)) {
    throw new Error(`The logging sidecar requires a concrete ${name}, but received an unresolved token.`);
  }
  if (/\s/.test(value) || value.includes("${")) {
    throw new Error(`The logging sidecar cannot use ${name} "${value}": it must not contain whitespace or "\${".`);
  }
}

/**
 * Builds the Guardian Fluent Bit config for an application. The application identity is written directly into the
 * config, so the log router does not need it in its environment. The `gu:repo` field is omitted when the repository
 * is unknown.
 *
 * Every record also gets `gu:logging-sidecar`, the sidecar image digest, to help with debugging.
 *
 * `OUTPUT_PLUGIN` remains an environment variable so tests can direct the additional output to `stdout`.
 */
export function guardianFluentBitConfig(identity: LoggingSidecarIdentity): string {
  const { stack, stage, app, repositoryName } = identity;

  const fields: Array<[string, string | undefined]> = [
    ["stack", stack],
    ["stage", stage],
    ["app", app],
    ["gu:repo", repositoryName],
    // Required by https://github.com/guardian/devx-logs
    ["task", app],
  ];

  const additions = fields
    .filter((field): field is [string, string] => field[1] !== undefined)
    .map(([key, value]) => {
      validateIdentityValue(key, value);
      return `    Add ${key} ${value}`;
    });

  return `
[FILTER]
    Name modify
    Match *
    Rename log message

[FILTER]
    Name parser
    Match *
    Key_Name message
    Parser json
    Reserve_Data On

[FILTER]
    Name modify
    Match *
    Add ShippedBy devx-logs
    Add gu:logging-sidecar ${LOGGING_SIDECAR_IMAGE_DIGEST}
${additions.join("\n")}

[OUTPUT]
    Name \${OUTPUT_PLUGIN}
    Match *`;
}

/**
 * Environment variables specific to the log router container.
 *
 * `aws_fluent_bit_init_file_N` tells the init process which config files to load. Parser files are passed to
 * Fluent Bit with `-R`, and the others are included in the main config. The include order does not change the shipped
 * fields, because Fluent Bit applies every filter before any output and the `parser` filter keeps existing fields.
 */
export function loggingSidecarEnvironment(identity: LoggingSidecarIdentity): Record<string, string> {
  return {
    aws_fluent_bit_init_file_1: "/tmp/guardian/guardian-parsers.conf",
    aws_fluent_bit_init_file_2: "/ecs/ecs-metadata.conf",
    aws_fluent_bit_init_file_3: "/tmp/guardian/guardian.conf",

    // The Guardian config duplicates output to this plugin, which makes local testing easy. It is discarded in production.
    OUTPUT_PLUGIN: "null",

    GU_FLUENT_BIT_PARSERS: GUARDIAN_FLUENT_BIT_PARSERS,
    GU_FLUENT_BIT_CONFIG: guardianFluentBitConfig(identity),
  };
}
