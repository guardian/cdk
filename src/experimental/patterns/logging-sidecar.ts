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

export const LOGGING_SIDECAR_IMAGE =
  "public.ecr.aws/aws-observability/aws-for-fluent-bit:init-3.4.11@sha256:0aa2921b14e44b8f00e057c68a0a3bafb944261a1c5aac36362bf2e1be8bef4d";

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

export const GUARDIAN_FLUENT_BIT_CONFIG = `
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
    Add stack \${STACK}
    Add stage \${STAGE}
    Add app \${APP}
    Add gu:repo \${GU_REPO}
    Add task \${TASK_NAME}

[OUTPUT]
    Name \${OUTPUT_PLUGIN}
    Match *`;

/**
 * Environment variables specific to the log router container.
 *
 * `aws_fluent_bit_init_file_N` tells the init process which config files to load. Parser files are passed to
 * Fluent Bit with `-R`, and the others are included in the main config. The include order does not change the shipped
 * fields, because Fluent Bit applies every filter before any output and the `parser` filter keeps existing fields.
 */
export const LOGGING_SIDECAR_ENVIRONMENT: Record<string, string> = {
  aws_fluent_bit_init_file_1: "/tmp/guardian/guardian-parsers.conf",
  aws_fluent_bit_init_file_2: "/ecs/ecs-metadata.conf",
  aws_fluent_bit_init_file_3: "/tmp/guardian/guardian.conf",

  // The Guardian config duplicates output to this plugin, which makes local testing easy. It is discarded in production.
  OUTPUT_PLUGIN: "null",

  GU_FLUENT_BIT_PARSERS: GUARDIAN_FLUENT_BIT_PARSERS,
  GU_FLUENT_BIT_CONFIG: GUARDIAN_FLUENT_BIT_CONFIG,
};
