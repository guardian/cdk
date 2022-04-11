import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { LibraryInfo } from "../../../../constants";

export interface InitConfig {
  outputDir: string;
}

// TODO: Add yarn or npm flag
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
    devDependencies: {
      /*
      Do not add `@guardian/cdk` to the generated `package.json` file when in TEST as we'll `npm link` it instead.
      See https://docs.npmjs.com/cli/v8/commands/npm-link#caveat

      TODO remove this once the `new` command allows opting out of automatic dependency installation
       */
      ...(!isTest && { "@guardian/cdk": LibraryInfo.VERSION }),

      "@guardian/eslint-config-typescript": "^0.7.0",
      "@types/jest": "^27.0.2",
      "@types/node": "16.11.7",
      "aws-cdk": LibraryInfo.AWS_CDK_VERSION,
      "aws-cdk-lib": LibraryInfo.AWS_CDK_VERSION,
      constructs: LibraryInfo.CONSTRUCTS_VERSION,
      eslint: "^7.32.0",
      jest: "^27.3.1",
      prettier: "^2.4.1",
      "source-map-support": "^0.5.20",
      "ts-jest": "^27.0.7",
      "ts-node": "^10.4.0",
      typescript: "~4.4.3",
    },
  };
  writeFileSync(`${outputDirectory}/package.json`, JSON.stringify(contents, null, 2));
}
