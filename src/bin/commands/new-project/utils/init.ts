import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { getDevDependency, LibraryInfo } from "../../../../constants";

export interface InitConfig {
  outputDir: string;
}

// TODO: Add project name flag
export class ProjectBuilder {
  templateDir = `${__dirname}/../template`;
  config: InitConfig;

  static validateConfig = (config: InitConfig): void => {
    const path = config.outputDir;
    if (existsSync(path) && readdirSync(path).length > 0) {
      throw new Error(`Directory ${path} is not empty`);
    }
  };

  constructor(config: InitConfig) {
    this.config = config;
  }

  buildDirectory(): void {
    ProjectBuilder.validateConfig(this.config);

    if (!existsSync(this.config.outputDir)) {
      console.log(`Creating ${this.config.outputDir}`);
      mkdirSync(this.config.outputDir);
    }

    console.log("Creating package.json");
    createPackageJson(this.config.outputDir);

    console.log("Copying template files");
    // TODO: Replace any params in files with .template extensions
    this.copyFiles(this.templateDir, this.config.outputDir);

    console.log("Success!");
  }

  copyFiles(sourcePath: string, targetPath: string): void {
    for (const file of readdirSync(sourcePath)) {
      const path = join(sourcePath, file);

      if (path.endsWith(".ignore")) {
        continue;
      } else if (lstatSync(path).isDirectory()) {
        const nestedTargetPath = join(targetPath, file);
        if (!existsSync(nestedTargetPath)) {
          mkdirSync(nestedTargetPath);
        }
        this.copyFiles(path, nestedTargetPath);
      } else if (path.endsWith(".template")) {
        copyFileSync(path, join(targetPath, file.replace(".template", "")));
      } else {
        copyFileSync(path, join(targetPath, file));
      }
    }
  }
}

export const buildDirectory = (config: InitConfig): void => {
  const builder = new ProjectBuilder(config);
  builder.buildDirectory();
};

function createPackageJson(outputDirectory: string): void {
  const { NODE_ENV, CI } = process.env;
  const isTest = NODE_ENV?.toUpperCase() === "TEST" || CI?.toUpperCase() === "TRUE";

  const coreDeps: Record<string, string> = [
    "@guardian/eslint-config-typescript",
    "@types/jest",
    "@types/node",
    "eslint",
    "jest",
    "prettier",
    "ts-jest",
    "ts-node",
    "typescript",
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- deps come from `package.json`, so shouldn't be `undefined`
  ].reduce((acc, depName) => ({ ...acc, [depName]: getDevDependency(depName)! }), {});

  const cdkDeps: Record<string, string> = {
    /*
      Do not add `@guardian/cdk` to the generated `package.json` file when in TEST as we'll `npm link` it instead.
      See https://docs.npmjs.com/cli/v8/commands/npm-link#caveat

      TODO remove this once the `new` command allows opting out of automatic dependency installation
       */
    ...(!isTest && { "@guardian/cdk": LibraryInfo.VERSION }),

    "aws-cdk": LibraryInfo.AWS_CDK_VERSION,
    "aws-cdk-lib": LibraryInfo.AWS_CDK_VERSION,
    constructs: LibraryInfo.CONSTRUCTS_VERSION,
  };

  const customDeps = {
    "source-map-support": "^0.5.20",
    "@guardian/prettier": "1.0.0",
  };

  const allDeps: Record<string, string> = { ...coreDeps, ...cdkDeps, ...customDeps };

  const devDependencies: Record<string, string> = Object.keys(allDeps)
    .sort()
    .reduce((acc, depName) => ({ ...acc, [depName]: allDeps[depName] }), {});

  const contents = {
    name: "cdk",
    version: "0.0.0",
    private: true,
    scripts: {
      build: "tsc",
      test: "jest",
      format: 'prettier --write "{lib,bin}/**/*.ts"',
      lint: "eslint lib/** bin/** --ext .ts --no-error-on-unmatched-pattern",
      synth: "cdk synth --path-metadata false --version-reporting false",
      diff: "cdk diff --path-metadata false --version-reporting false",
    },
    devDependencies,

    prettier: "@guardian/prettier",

    eslintConfig: {
      root: true,
      env: {
        node: true,
        jest: true,
      },
      extends: ["@guardian/eslint-config-typescript"],
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
      plugins: ["@typescript-eslint"],
      rules: {
        "@typescript-eslint/no-inferrable-types": 0,
        "import/no-namespace": 2,
      },
      ignorePatterns: ["**/*.js", "node_modules", "cdk.out", ".eslintrc.js", "jest.config.js"],
    },
  };
  writeFileSync(`${outputDirectory}/package.json`, JSON.stringify(contents, null, 2));
}
