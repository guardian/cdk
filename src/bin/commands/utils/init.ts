import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";

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

  /* eslint-disable -- copied from https://github.com/aws/aws-cdk/blob/eda1640fcaf6375d7edc5f8edcb5d69c82d130a1/packages/aws-cdk/lib/init.ts */
  constructor(config: InitConfig) {
    this.config = config;
  }
  /* eslint-enable */

  buildDirectory(): void {
    ProjectBuilder.validateConfig(this.config);

    if (!existsSync(this.config.outputDir)) {
      console.log(`Creating ${this.config.outputDir}`);
      mkdirSync(this.config.outputDir);
    }

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
