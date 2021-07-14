import readPkgUp from "read-pkg-up";

const version = readPkgUp.sync({ cwd: __dirname })?.packageJson.version ?? "unknown";

export const LibraryInfo = {
  /**
   * The current version of `@guardian/cdk`.
   */
  VERSION: version,
};
