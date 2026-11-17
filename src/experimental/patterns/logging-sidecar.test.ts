import { Token } from "aws-cdk-lib";
import { guardianFluentBitConfig, LOGGING_SIDECAR_IMAGE, LOGGING_SIDECAR_IMAGE_DIGEST } from "./logging-sidecar";

describe("guardianFluentBitConfig", () => {
  const identity = { stack: "deploy", stage: "PROD", app: "amiable", repositoryName: "guardian/amiable" };

  it("writes the application identity directly into the config", () => {
    const config = guardianFluentBitConfig(identity);

    expect(config).toContain(
      [
        "    Add ShippedBy devx-logs",
        `    Add gu:logging-sidecar ${LOGGING_SIDECAR_IMAGE_DIGEST}`,
        "    Add stack deploy",
        "    Add stage PROD",
        "    Add app amiable",
        "    Add gu:repo guardian/amiable",
        "    Add task amiable",
      ].join("\n"),
    );
  });

  it("identifies the sidecar by the digest of the image it runs", () => {
    expect(LOGGING_SIDECAR_IMAGE_DIGEST).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(LOGGING_SIDECAR_IMAGE.endsWith(`@${LOGGING_SIDECAR_IMAGE_DIGEST}`)).toBe(true);
  });

  it("leaves OUTPUT_PLUGIN as the only environment variable", () => {
    const variables = guardianFluentBitConfig(identity).match(/\$\{[^}]+\}/g);

    expect(variables).toEqual(["${OUTPUT_PLUGIN}"]);
  });

  it("omits the gu:repo field when the repository is unknown", () => {
    const config = guardianFluentBitConfig({ ...identity, repositoryName: undefined });

    expect(config).not.toContain("gu:repo");
    expect(config).toContain("    Add app amiable\n    Add task amiable");
  });

  it.each([
    ["whitespace", "my app"],
    ["a newline", "my\napp"],
    ["an environment variable reference", "${APP}"],
  ])("rejects values containing %s", (_, app) => {
    expect(() => guardianFluentBitConfig({ ...identity, app })).toThrow(
      `The logging sidecar cannot use app "${app}": it must not contain whitespace or "\${".`,
    );
  });

  it("rejects unresolved tokens", () => {
    const stage = Token.asString({ Ref: "Stage" });

    expect(() => guardianFluentBitConfig({ ...identity, stage })).toThrow(
      "The logging sidecar requires a concrete stage, but received an unresolved token.",
    );
  });
});
