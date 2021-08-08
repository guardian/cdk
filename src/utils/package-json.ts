import type { NormalizedPackageJson, PackageJson } from "read-pkg-up";

const filterForAwsCdkDeps = (deps: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(deps).filter(([dependency]) => dependency === "aws-cdk" || dependency.startsWith("@aws-cdk/"))
  );

export const getAwsCdkDependencies: (packageJson: PackageJson | NormalizedPackageJson) => {
  devDependencies: Record<string, string>;
  dependencies: Record<string, string>;
} = (packageJson: PackageJson | NormalizedPackageJson) => {
  const { dependencies, devDependencies } = packageJson;

  return {
    dependencies: filterForAwsCdkDeps(dependencies ?? {}),
    devDependencies: filterForAwsCdkDeps(devDependencies ?? {}),
  };
};

export const getAwsCdkCoreVersion: (packageJson: PackageJson | NormalizedPackageJson) => string | undefined = (
  packageJson: PackageJson | NormalizedPackageJson
) => {
  const packageName = "@aws-cdk/core";
  const { dependencies, devDependencies } = getAwsCdkDependencies(packageJson);
  return dependencies[packageName] || devDependencies[packageName];
};
