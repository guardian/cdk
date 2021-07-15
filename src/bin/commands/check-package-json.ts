import { access, readFile } from "fs/promises";
import path from "path";
import type { PackageJson } from "read-pkg-up";
import { LibraryInfo } from "../../constants/library-info";
import type { CliCommandResponse } from "../../types/command";
import { getAwsCdkDependencies } from "../../utils/package-json";

const filterVersionMismatch = (deps: Record<string, string>) =>
  Object.fromEntries(Object.entries(deps).filter(([, version]) => version !== LibraryInfo.AWS_CDK_VERSION));

export const checkPackageJson = async (directory: string): CliCommandResponse => {
  const packageJsonPath = path.join(directory, "package.json");

  try {
    await access(packageJsonPath);
  } catch (error) {
    return Promise.reject(`File not found: ${packageJsonPath}`);
  }

  const fileContent = await readFile(packageJsonPath, { encoding: "utf8" });
  const packageJson = JSON.parse(fileContent) as PackageJson;

  const { dependencies, devDependencies } = getAwsCdkDependencies(packageJson);

  const depsMismatch = filterVersionMismatch(dependencies);
  const devDepsMismatch = filterVersionMismatch(devDependencies);
  const totalMismatch = Object.keys(depsMismatch).length + Object.keys(devDepsMismatch).length;

  const isOk = totalMismatch === 0;

  const response = {
    file: packageJsonPath,
    versionExpected: LibraryInfo.AWS_CDK_VERSION,
    incorrectDependencies: depsMismatch,
    incorrectDevDependencies: devDepsMismatch,
  };

  return isOk ? Promise.resolve(response) : Promise.reject(response);
};
