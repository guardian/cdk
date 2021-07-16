import readPkgUp from "read-pkg-up";

const packageJson = readPkgUp.sync({ cwd: __dirname })?.packageJson;

const version = packageJson?.version ?? "unknown";

const dependencies = packageJson?.dependencies ?? {};

const awsCdkDependencies: Record<string, string> = Object.fromEntries(
  Object.entries(dependencies).filter(([dependency]) => dependency.startsWith("@aws-cdk"))
);

const awsCdkCoreVersion = awsCdkDependencies["@aws-cdk/core"];

export const LibraryInfo = {
  /**
   * The current version of `@guardian/cdk`.
   */
  VERSION: version,

  /**
   * The version of the `@aws-cdk` libraries used by `@guardian/cdk`.
   * You need to match this version exactly.
   */
  AWS_CDK_VERSION: awsCdkCoreVersion,

  /**
   * A complete list of the `@aws-cdk` libraries used by `@guardian/cdk`.
   */
  AWS_CDK_VERSIONS: awsCdkDependencies,
};
