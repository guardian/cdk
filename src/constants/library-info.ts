import { env } from "node:process";
import type { NormalizedPackageJson, PackageJson } from "read-pkg-up";
import readPkgUp from "read-pkg-up";

const valueOrUnknown = (value: string | undefined) => value ?? "unknown";

const packageJson: PackageJson | NormalizedPackageJson = readPkgUp.sync({ cwd: __dirname })?.packageJson ?? {};

const version = valueOrUnknown(packageJson.version);

export function getDevDependency(packageName: string): string | undefined {
  const { devDependencies = {} } = packageJson;
  return devDependencies[packageName];
}

export function getDependency(packageName: string): string | undefined {
  const { dependencies = {} } = packageJson;
  return dependencies[packageName];
}

const isTestEnvironment = env.NODE_ENV === "test";

export const LibraryInfo = {
  /**
   * The name of this package
   */
  NAME: "@guardian/cdk",

  /**
   * The current version of `@guardian/cdk`.
   */
  VERSION: isTestEnvironment ? "1.0.0" : version,

  /**
   * The version of the `aws-cdk` library used by `@guardian/cdk`.
   * You need to match this version exactly.
   */
  AWS_CDK_VERSION: isTestEnvironment ? "0.0.1" : valueOrUnknown(getDevDependency("aws-cdk")),

  /**
   * The version of the `aws-cdk-lib` library used by `@guardian/cdk`.
   * You need to match this version exactly.
   */
  AWS_CDK_LIB_VERSION: isTestEnvironment ? "0.0.1" : valueOrUnknown(getDevDependency("aws-cdk-lib")),

  /**
   * The version of the `constructs` library used by `@guardian/cdk`.
   * You need to match this version exactly.
   */
  CONSTRUCTS_VERSION: isTestEnvironment ? "0.0.1" : valueOrUnknown(getDevDependency("constructs")),
};
