import type { NormalizedPackageJson, PackageJson } from "read-pkg-up";
import readPkgUp from "read-pkg-up";

const valueOrUnknown = (value: string | undefined) => value ?? "unknown";

const packageJson: PackageJson | NormalizedPackageJson = readPkgUp.sync({ cwd: __dirname })?.packageJson ?? {};

const version = valueOrUnknown(packageJson.version);

export function getDevDependency(packageName: string): string | undefined {
  const { devDependencies = {} } = packageJson;
  return devDependencies[packageName];
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
   * The version of the `aws-cdk-lib` library used by `@guardian/cdk`.
   * You need to match this version exactly.
   */
  AWS_CDK_VERSION: valueOrUnknown(getDevDependency("aws-cdk-lib")),

  /**
   * The version of the `constructs` library used by `@guardian/cdk`.
   * You need to match this version exactly.
   */
  CONSTRUCTS_VERSION: valueOrUnknown(getDevDependency("constructs")),
};
