import type { NormalizedPackageJson, PackageJson } from "read-pkg-up";
import readPkgUp from "read-pkg-up";

const valueOrUnknown = (value: string | undefined) => value ?? "unknown";

const packageJson: PackageJson | NormalizedPackageJson = readPkgUp.sync({ cwd: __dirname })?.packageJson ?? {};

// Static values when NODE_ENV=test so snapshots don't change on every version bump
const isTest = process.env.NODE_ENV === "test";
const mockVersion = "0.0.1";

const version = isTest ? "1.0.0" : valueOrUnknown(packageJson.version);

export function getDevDependency(packageName: string): string | undefined {
  const { devDependencies = {} } = packageJson;
  return devDependencies[packageName];
}

export function getDependency(packageName: string): string | undefined {
  const { dependencies = {} } = packageJson;
  return dependencies[packageName];
}

export const LibraryInfo = {
  /**
   * The name of this package
   */
  NAME: "@guardian/cdk",

  /**
   * The current version of `@guardian/cdk`.
   */
  VERSION: version,

  /**
   * The version of the `aws-cdk` library used by `@guardian/cdk`.
   * You need to match this version exactly.
   */
  AWS_CDK_VERSION: isTest ? mockVersion : valueOrUnknown(getDevDependency("aws-cdk")),

  /**
   * The version of the `aws-cdk-lib` library used by `@guardian/cdk`.
   * You need to match this version exactly.
   */
  AWS_CDK_LIB_VERSION: isTest ? mockVersion : valueOrUnknown(getDevDependency("aws-cdk-lib")),

  /**
   * The version of the `constructs` library used by `@guardian/cdk`.
   * You need to match this version exactly.
   */
  CONSTRUCTS_VERSION: isTest ? mockVersion : valueOrUnknown(getDevDependency("constructs")),
};
