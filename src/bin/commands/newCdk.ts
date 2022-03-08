import { existsSync } from "fs";
import { basename, dirname, join } from "path";
import chalk from "chalk";
import { cli } from "cli-ux";
import kebabCase from "lodash.kebabcase";
import type { CliCommandResponse } from "../../types/cli";
import { constructApp } from "./utils/app";
import { execute } from "./utils/exec";
import { gitRootOrCwd } from "./utils/git";
import { newAppImports, newStackImports, newTestImports } from "./utils/imports";
import { buildDirectory } from "./utils/init";
import { constructTest } from "./utils/snapshot";
import { constructStack } from "./utils/stack";
import type { Name } from "./utils/utils";
import { pascalCase } from "./utils/utils";

interface NewCdkProps {
  init: boolean;
  app: string;
  stack: string;
  yamlTemplateLocation?: string;
}

interface NewCommandConfig {
  cdkDir: string;
  appPath: string;
  appName: Name;
  stackPath: string;
  stackName: Name;
  testPath: string;
  init: boolean;
  yamlTemplateLocation?: string;
}

export const checkPathExists = (path: string): void => {
  if (!existsSync(path)) {
    throw new Error(`File not found - ${path}`);
  }
};

export const checkPathDoesNotExist = (path: string): void => {
  if (existsSync(path)) {
    throw new Error(`There is already a file at - ${path}`);
  }
};

function validateConfig(config: NewCommandConfig): void {
  if (!config.init) {
    checkPathExists(config.cdkDir);
  }
  checkPathDoesNotExist(config.appPath); // TODO: Update the app file if it already exists
  checkPathDoesNotExist(config.stackPath);

  if (config.yamlTemplateLocation) {
    checkPathExists(config.yamlTemplateLocation);
  }
}

async function getConfig(props: NewCdkProps): Promise<NewCommandConfig> {
  const rootDir = await gitRootOrCwd();
  const cdkDir = join(rootDir, "/cdk");

  const appName = pascalCase(props.app);
  const kebabAppName = kebabCase(appName);
  const stackName = pascalCase(props.stack);
  const kebabStackName = kebabCase(stackName);

  const config: NewCommandConfig = {
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
    init: props.init,
    yamlTemplateLocation: props.yamlTemplateLocation,
  };

  validateConfig(config);

  return config;
}

export const newCdk = async (props: NewCdkProps): CliCommandResponse => {
  console.log("Starting CDK generator");

  const config = await getConfig(props);

  if (config.init) {
    buildDirectory({ outputDir: config.cdkDir });
  }

  console.log(`New app ${config.appName.pascal} will be written to ${config.appPath}`);
  console.log(`New stack ${config.stackName.pascal} will be written to ${config.stackPath}`);

  // bin directory
  await constructApp({
    appName: config.appName,
    outputFile: "cdk.ts",
    outputDir: dirname(config.appPath),
    stack: config.stackName,
    imports: newAppImports(config.appName),
  });

  // lib directory
  await constructStack({
    imports: newStackImports(),
    appName: config.appName,
    outputFile: basename(config.stackPath),
    outputDir: dirname(config.stackPath),
    yamlTemplateLocation: config.yamlTemplateLocation,
  });

  // lib directory
  await constructTest({
    imports: newTestImports(config.appName),
    stackName: config.stackName,
    appName: config.appName,
    outputFile: basename(config.testPath),
    outputDir: dirname(config.stackPath),
  });

  if (config.init) {
    cli.action.start(chalk.yellow("Installing dependencies. This may take a while..."));
    await execute("./script/setup", [], { cwd: config.cdkDir });
    cli.action.stop();
  }

  // Run `eslint --fix` on the generated files instead of trying to generate code that completely satisfies the linter
  await execute(
    "./node_modules/.bin/eslint",
    ["lib/** bin/**", "--ext .ts", "--no-error-on-unmatched-pattern", "--fix"],
    {
      cwd: config.cdkDir,
    }
  );

  cli.action.start(chalk.yellow("Running tests..."));
  await execute("./script/test", [], { cwd: config.cdkDir });
  cli.action.stop();

  console.log(chalk.green("Summarising the created files"));
  const tree = await execute("tree", ["-I 'node_modules|cdk.out'"], {
    cwd: config.cdkDir,
  });
  console.log(tree);

  console.log("Project successfully created! Next steps:");

  [
    "Run ./script/diff to confirm there are no destructive changes (there should only be tag additions)",
    "Update the repository's CI configuration to run ./script/ci",
    "Raise a PR with these changes",
  ].map((step) => console.log(`  - ${step}`));

  return Promise.resolve("Project successfully created!");
};
