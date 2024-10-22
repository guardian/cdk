import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import type { PackageManager } from "..";
import { getDevDependency, LibraryInfo } from "../../../../constants";

export interface InitConfig {
  outputDir: string;
  packageManager: PackageManager;
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

    if (this.config.packageManager === "deno") {
      console.log("Creating deno.json");
      createDenoJson(this.config.outputDir);
    } else {
      console.log("Creating package.json");
      createPackageJson(this.config.outputDir);
    }

    console.log("Copying template files");
    // TODO: Replace any params in files with .template extensions
    this.copyFiles({
      sourcePath: this.templateDir,
      targetPath: this.config.outputDir,
      packageManager: this.config.packageManager,
    });

    console.log("Success!");
  }

  copyFiles({
    sourcePath,
    targetPath,
    packageManager,
  }: {
    sourcePath: string;
    targetPath: string;
    packageManager: string;
  }): void {
    const denoIgnore = ["bin", "jest.setup.js", "tsconfig.json.template"];

    for (const file of readdirSync(sourcePath)) {
      const path = join(sourcePath, file);

      if (packageManager === "deno" && denoIgnore.includes(file)) {
        continue;
      }

      if (path.endsWith(".ignore")) {
        continue;
      } else if (lstatSync(path).isDirectory()) {
        const nestedTargetPath = join(targetPath, file);
        if (!existsSync(nestedTargetPath)) {
          mkdirSync(nestedTargetPath);
        }
        this.copyFiles({
          sourcePath: path,
          targetPath: nestedTargetPath,
          packageManager,
        });
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
    "@guardian/tsconfig",
    "@types/jest",
    "@types/node",
    "eslint",
    "jest",
    "prettier",
    "ts-jest",
    "ts-node",
    "typescript",
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
    "@guardian/prettier": "5.0.0",
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
      "test-update": "jest -u",
      format: 'prettier --write "{lib,bin}/**/*.ts"',
      lint: "eslint lib/** bin/** --ext .ts --no-error-on-unmatched-pattern",
      synth: "cdk synth --path-metadata false --version-reporting false",
      diff: "cdk diff --path-metadata false --version-reporting false",
    },
    devDependencies,

    prettier: "@guardian/prettier",

    jest: {
      testMatch: ["<rootDir>/lib/**/*.test.ts"],
      transform: {
        "^.+\\.tsx?$": "ts-jest",
      },
      setupFilesAfterEnv: ["./jest.setup.js"],
    },

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

function createDenoJson(outputDirectory: string): void {
  const { NODE_ENV, CI } = process.env;
  const isTest = NODE_ENV?.toUpperCase() === "TEST" || CI?.toUpperCase() === "TRUE";

  const deps: Record<string, string> = {
    /*
      Do not add `@guardian/cdk` to the generated `package.json` file when in TEST as we'll `npm link` it instead.
      See https://docs.npmjs.com/cli/v8/commands/npm-link#caveat

      TODO remove this once the `new` command allows opting out of automatic dependency installation
       */
    ...(!isTest && { "@guardian/cdk": `npm:@guardian/cdk@${LibraryInfo.VERSION}` }),

    "@std/testing": "jsr:@std/testing@1.0.3",
    "aws-cdk": `npm:aws-cdk@${LibraryInfo.AWS_CDK_VERSION}`,
    "aws-cdk-lib": `npm:aws-cdk-lib@${LibraryInfo.AWS_CDK_VERSION}`,
    constructs: `npm:constructs@${LibraryInfo.CONSTRUCTS_VERSION}`,
  };

  const imports: Record<string, string> = Object.keys(deps)
    .sort()
    .reduce((acc, depName) => ({ ...acc, [depName]: deps[depName] }), {});

  const contents = {
    tasks: {
      test: "deno test --allow-env=TMPDIR --allow-read --allow-write --allow-sys",
      "test-update": "deno test --allow-env=TMPDIR --allow-read --allow-write --allow-sys -- -u",
      synth: "cdk synth --path-metadata false --version-reporting false",
      diff: "cdk diff --path-metadata false --version-reporting false",
    },
    imports,
  };
  writeFileSync(`${outputDirectory}/deno.json`, JSON.stringify(contents, null, 2));
}
