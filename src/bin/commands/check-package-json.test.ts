import { promises } from "fs";
import { checkPackageJson } from "./check-package-json";

describe("checkPackageJson", () => {
  const mockPackageJson = (content: unknown) => {
    jest.spyOn(promises, "access").mockReturnValue(Promise.resolve());
    jest.spyOn(promises, "readFile").mockReturnValue(Promise.resolve(JSON.stringify(content)));
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should succeed when the versions match exactly", async () => {
    mockPackageJson({
      dependencies: {
        "aws-cdk": "0.0.1",
        "@aws-cdk/aws-ec2": "0.0.1",
      },
    });

    const actual = await checkPackageJson("/tmp");

    const expected = {
      file: "/tmp/package.json",
      incorrectDependencies: {},
      incorrectDevDependencies: {},
      versionExpected: "0.0.1",
    };

    expect(actual).toStrictEqual(expected);
  });

  it("should fail when the versions do not match exactly", async () => {
    mockPackageJson({
      dependencies: {
        "aws-cdk": "^0.0.1",
        "@aws-cdk/aws-ec2": "0.0.1",
      },
      devDependencies: {
        "@aws-cdk/aws-iam": "0.0.2",
      },
    });

    try {
      await checkPackageJson("/tmp");
    } catch (actual) {
      const expected = {
        file: "/tmp/package.json",
        incorrectDependencies: {
          "aws-cdk": "^0.0.1",
        },
        incorrectDevDependencies: {
          "@aws-cdk/aws-iam": "0.0.2",
        },
        versionExpected: "0.0.1",
      };
      expect(actual).toStrictEqual(expected);
    }
  });

  it("should fail when the package.json file does not exist", async () => {
    jest.spyOn(promises, "access").mockReturnValue(Promise.reject());

    try {
      await checkPackageJson("/tmp");
    } catch (actual) {
      const expected = "File not found: /tmp/package.json";
      expect(actual).toBe(expected);
    }
  });
});
