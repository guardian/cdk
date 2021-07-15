import type { PackageJson } from "read-pkg-up";
import { getAwsCdkCoreVersion, getAwsCdkDependencies } from "./package-json";

describe("getAwsCdkDependencies", () => {
  it("should return aws-cdk dependencies when they exist", () => {
    const packageJson = {
      dependencies: { "@aws-cdk/aws-s3": "1.100.0", "@aws-cdk/core": "1.100.0", execa: "^5.1.1" },
      devDependencies: { "@types/node": "16.3.2", typescript: "~4.3.4", "aws-cdk": "100.0.0" },
    } as PackageJson;

    const actual = getAwsCdkDependencies(packageJson);

    const expected = {
      dependencies: {
        "@aws-cdk/aws-s3": "1.100.0",
        "@aws-cdk/core": "1.100.0",
      },
      devDependencies: {
        "aws-cdk": "100.0.0",
      },
    };

    expect(actual).toStrictEqual(expected);
  });

  it("should return empty objects when no aws-cdk dependencies are present", () => {
    const packageJson = {
      dependencies: { execa: "^5.1.1" },
      devDependencies: { "@types/node": "16.3.2", typescript: "~4.3.4" },
    } as PackageJson;

    const actual = getAwsCdkDependencies(packageJson);

    const expected = {
      dependencies: {},
      devDependencies: {},
    };

    expect(actual).toStrictEqual(expected);
  });
});

describe("getAwsCdkCoreVersion", () => {
  it("should return the value from dependencies", () => {
    const packageJson = {
      dependencies: { "@aws-cdk/core": "1.100.0", execa: "^5.1.1" },
      devDependencies: { "@types/node": "16.3.2", typescript: "~4.3.4" },
    } as PackageJson;

    const actual = getAwsCdkCoreVersion(packageJson);

    expect(actual).toBe("1.100.0");
  });

  it("should return the value from devDependencies", () => {
    const packageJson = {
      dependencies: { execa: "^5.1.1" },
      devDependencies: { "@aws-cdk/core": "1.100.0", "@types/node": "16.3.2", typescript: "~4.3.4" },
    } as PackageJson;

    const actual = getAwsCdkCoreVersion(packageJson);

    expect(actual).toBe("1.100.0");
  });

  it("should return undefined when the @aws-cdk/core package isn't present", () => {
    const packageJson = {
      dependencies: { execa: "^5.1.1" },
      devDependencies: { "@types/node": "16.3.2", typescript: "~4.3.4" },
    } as PackageJson;

    const actual = getAwsCdkCoreVersion(packageJson);

    expect(actual).toBeUndefined();
  });
});
