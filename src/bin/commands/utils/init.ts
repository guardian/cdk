import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { LibraryInfo } from "../../../constants/library-info";

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
  const contents = {
    name: "cdk",
    version: "0.0.0",
    private: true,
    bin: {
      cdk: "bin/cdk.js",
    },
    scripts: {
      build: "tsc",
      watch: "tsc -w",
      test: "jest",
      "test:dev": "jest --watch",
      format: 'prettier --write "{lib,bin}/**/*.ts"',
      cdk: "cdk",
      lint: "eslint lib/** bin/** --ext .ts --no-error-on-unmatched-pattern",
      synth: "cdk synth --path-metadata false --version-reporting false",
      diff: "cdk diff --path-metadata false --version-reporting false",
    },
    devDependencies: {
      "@aws-cdk/assert": LibraryInfo.AWS_CDK_VERSION,
      "@guardian/eslint-config-typescript": "^0.7.0",
      "@types/jest": "^27.0.2",
      "@types/node": "16.11.7",
      "aws-cdk": LibraryInfo.AWS_CDK_VERSION,
      eslint: "^7.32.0",
      jest: "^27.3.1",
      prettier: "^2.4.1",
      "ts-jest": "^27.0.7",
      "ts-node": "^10.4.0",
      typescript: "~4.4.3",
    },
    dependencies: {
      "@aws-cdk/cloudformation-include": LibraryInfo.AWS_CDK_VERSION,
      "@aws-cdk/core": LibraryInfo.AWS_CDK_VERSION,
      "@guardian/cdk": LibraryInfo.VERSION,
      "source-map-support": "^0.5.20",
    },
  };
  writeFileSync(`${outputDirectory}/package.json`, JSON.stringify(contents, null, "\t"));
}
