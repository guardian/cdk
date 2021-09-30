import readPkgUp from "read-pkg-up";
import { getAwsCdkCoreVersion, getAwsCdkDependencies } from "../utils/package-json";

const valueOrUnknown = (value: string | undefined) => value ?? "unknown";

const packageJson = readPkgUp.sync({ cwd: __dirname })?.packageJson;

const version = valueOrUnknown(packageJson?.version);

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
   * The version of the `@aws-cdk` libraries used by `@guardian/cdk`.
   * You need to match this version exactly.
   */
  AWS_CDK_VERSION: valueOrUnknown(getAwsCdkCoreVersion(packageJson ?? {})),

  /**
   * A complete list of the `@aws-cdk` libraries used by `@guardian/cdk`.
   */
  AWS_CDK_VERSIONS: getAwsCdkDependencies(packageJson ?? {}),
};
