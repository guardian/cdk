import { existsSync, unlinkSync, linkSync } from "fs";
import { basename, dirname, join } from "path";
import { CliUx } from "@oclif/core";
import chalk from "chalk";
import kebabCase from "lodash.kebabcase";
import type { CliCommandResponse } from "../../../types/cli";
import { execute } from "../../../utils/exec";
import { gitRootOrCwd } from "../../../utils/git";
import { constructApp } from "./utils/app";
import { Imports } from "./utils/imports";
import { buildDirectory } from "./utils/init";
import { constructTest } from "./utils/snapshot";
import { constructStack } from "./utils/stack";
import type { Name } from "./utils/utils";
import { getCommands, pascalCase } from "./utils/utils";

export type PackageManager = "npm" | "yarn";

interface NewProjectProps {
  init: boolean;
  app: string;
  stack: string;
  stages: string[];
  yamlTemplateLocation?: string;
  packageManager: PackageManager;
  recreate?: boolean;
}

interface NewProjectConfig extends Omit<NewProjectProps, "stack" | "app"> {
  cdkDir: string;
  appPath: string;
  appName: Name;
  stackPath: string;
  stackName: Name;
  testPath: string;
}

const checkPathExists = (path: string): void => {
  if (!existsSync(path)) {
    throw new Error(`File not found - ${path}`);
  }
};

const checkPathDoesNotExist = (path: string): void => {
  if (existsSync(path)) {
    throw new Error(`There is already a file at - ${path}`);
  }
};

function validateConfig(config: NewProjectConfig): void {
  if (!config.init) {
    checkPathExists(config.cdkDir);
  }
  checkPathDoesNotExist(config.appPath); // TODO: Update the app file if it already exists
  checkPathDoesNotExist(config.stackPath);

  if (config.yamlTemplateLocation) {
    checkPathExists(config.yamlTemplateLocation);
  }
}

function getConfig(props: NewProjectProps): NewProjectConfig {
  const { init, app, stack, stages, yamlTemplateLocation, packageManager } = props;

  const rootDir = gitRootOrCwd();
  const cdkDir = join(rootDir, "/cdk");

  const appName = pascalCase(app);
  const kebabAppName = kebabCase(appName);
  const stackName = pascalCase(stack);
  const kebabStackName = kebabCase(stackName);

  const config: NewProjectConfig = {
    init,
    yamlTemplateLocation,
    stages,
    cdkDir,
    appName: {
      kebab: kebabAppName,
      pascal: appName,
    },
    appPath: `${cdkDir}/bin/${kebabAppName}.ts`,
    stackName: {
      kebab: kebabStackName,
      pascal: stackName,
    },
    stackPath: `${cdkDir}/lib/${kebabAppName}.ts`,
    testPath: `${cdkDir}/lib/${kebabAppName}.test.ts`,
    packageManager,
  };

  validateConfig(config);

  return config;
}

export const newCdkProject = async (props: NewProjectProps): CliCommandResponse => {
  console.log("Starting CDK generator");

  const config = getConfig(props);

  if (config.init) {
    buildDirectory({ outputDir: config.cdkDir });
  }

  console.log(`New app ${config.appName.pascal} will be written to ${config.appPath}`);
  console.log(`New stack ${config.stackName.pascal} will be written to ${config.stackPath}`);

  // bin directory
  if (props.recreate) {
    unlinkSync("cdk/bin/cdk.ts")
    linkSync("cdk-src/cdk.ts", "cdk/bin/cdk.ts");
  } else {
    await constructApp({
      appName: config.appName,
      outputFile: "cdk.ts",
      outputDir: dirname(config.appPath),
      stack: config.stackName,
      imports: Imports.newAppImports(config.appName),
      stages: config.stages,
    });
  }

  // lib directory
  await constructStack({
    imports: Imports.newStackImports(),
    appName: config.appName,
    outputFile: basename(config.stackPath),
    outputDir: dirname(config.stackPath),
    yamlTemplateLocation: config.yamlTemplateLocation,
  });

  if (props.recreate) {
    unlinkSync(`cdk/lib/__snapshots__/${config.appName.pascal}.test.ts.snap`);
    linkSync(`cdk-src/${config.appName.pascal}.test.ts.snap`, `cdk/lib/__snapshots__/${config.appName.pascal}.test.ts.snap`);
    unlinkSync(`cdk/lib/${config.appName.pascal}.test.ts`);
    linkSync(`cdk-src/${config.appName.pascal}.test.ts`, `cdk/lib/${config.appName.pascal}.test.ts`);
    unlinkSync(`cdk/lib/${config.appName.pascal}.ts`);
    linkSync(`cdk-src/${config.appName.pascal}.ts`, `cdk/lib/${config.appName.pascal}.ts`);
  }

  // lib directory
  await constructTest({
    imports: Imports.newTestImports(config.appName),
    stackName: config.stackName,
    appName: config.appName,
    outputFile: basename(config.testPath),
    outputDir: dirname(config.stackPath),
  });

  const commands = getCommands(config.packageManager, config.cdkDir);

  if (config.init) {
    CliUx.ux.action.start(chalk.yellow("Installing dependencies. This may take a while..."));
    await commands.installDependencies();
    CliUx.ux.action.stop();
  }

  // Run `eslint --fix` on the generated files instead of trying to generate code that completely satisfies the linter
  await execute(
    "./node_modules/.bin/eslint",
    ["lib/** bin/**", "--ext .ts", "--no-error-on-unmatched-pattern", "--fix"],
    {
      cwd: config.cdkDir,
    }
  );

  CliUx.ux.action.start(chalk.yellow("Running lint check..."));
  await commands.lint();
  CliUx.ux.action.stop();

  CliUx.ux.action.start(chalk.yellow("Running tests..."));
  await commands.test();
  CliUx.ux.action.stop();

  CliUx.ux.action.start(chalk.yellow("Running initial synthesis..."));
  await commands.synth();
  CliUx.ux.action.stop();

  console.log(chalk.green("Success! Here's a summary of the created files:"));
  const tree = await execute("tree", ["-I 'node_modules|cdk.out'"], {
    cwd: config.cdkDir,
  });
  console.log(tree);

  const docsUrl = "https://github.com/guardian/cdk/tree/main/docs";
  CliUx.ux.url(chalk.green(`Please see the docs (${docsUrl}) for next steps.`), docsUrl);

  return Promise.resolve(0);
};
