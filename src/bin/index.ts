#!/usr/bin/env node

import yargs from "yargs";
import { LibraryInfo } from "../constants/library-info";
import type { CliCommandResponse } from "../types/cli";
import { awsCredentialProviderChain } from "./aws-credential-provider";
import { accountReadinessCommand } from "./commands/account-readiness";
import { awsCdkVersionCommand } from "./commands/aws-cdk-version";
import { checkPackageJson } from "./commands/check-package-json";

const Commands = {
  AwsCdkVersion: "aws-cdk-version",
  AccountReadiness: "account-readiness",
  CheckPackageJson: "check-package-json",
  New: "new",
};

const parseCommandLineArguments = () => {
  /*
  The type of `yargs.argv` is `T | Promise<T>`.
  To avoid creating custom type guards, use `Promise.resolve` which takes `T | PromiseLike<T>` and returns `Promise<T>`.
  That is, use `Promise.resolve` to provide a single type.
  See https://github.com/DefinitelyTyped/DefinitelyTyped/blob/7b2f0d45985538a40df96244481bfc6cd309c250/types/yargs/index.d.ts#L74
   */
  return Promise.resolve(
    yargs
      .usage("$0 COMMAND [args]")
      .command(Commands.AwsCdkVersion, "Print the version of @aws-cdk libraries being used")
      .command(Commands.AccountReadiness, "Perform checks on an AWS account to see if it is GuCDK ready", (yargs) =>
        yargs
          .option("profile", { type: "string", description: "AWS profile" })
          .option("region", { type: "string", description: "AWS region", default: "eu-west-1" })
      )
      .command(Commands.CheckPackageJson, "Check a package.json file for compatibility with GuCDK", (yargs) =>
        yargs.option("directory", {
          type: "string",
          description: "The location of the package.json file to check",
          default: process.cwd(),
          defaultDescription: "The current working directory",
        })
      )
      .command(Commands.New, "Creates a new CDK stack", (yargs) =>
        yargs
          .option("multi-app", {
            type: "boolean",
            description:
              "Create the stack files within sub directories as the project defines multiple apps (defaults to false)",
            default: false,
          })
          .option("init", {
            type: "boolean",
            description: "Create the cdk directory before building the app and stack files (defaults to true)",
            default: true,
          })
          .option("app", {
            type: "string",
            description: "The name of your application e.g. Amigo",
            demandOption: true,
          })
          .option("stack", {
            type: "string",
            description:
              "The Guardian stack being used (as defined in your riff-raff.yaml). This will be applied as a tag to all of your resources.",
            demandOption: true,
          })
          .option("yaml-template-location", {
            type: "string",
            description: "Path to the YAML CloudFormation template",
          })
      )
      .version(`${LibraryInfo.VERSION} (using @aws-cdk ${LibraryInfo.AWS_CDK_VERSION})`)
      .demandCommand(1, "") // just print help
      .help()
      .alias("h", "help").argv
  );
};

parseCommandLineArguments()
  .then((argv): CliCommandResponse => {
    const command = argv._[0];
    switch (command) {
      case Commands.AwsCdkVersion:
        return awsCdkVersionCommand();
      case Commands.AccountReadiness: {
        const { profile, region } = argv;
        return accountReadinessCommand({ credentialProvider: awsCredentialProviderChain(profile), region });
      }
      case Commands.CheckPackageJson: {
        const { directory } = argv;
        return checkPackageJson(directory);
      }
      case Commands.New: {
        const { init, "multi-app": multiApp, app, stack, "yaml-template-location": yamlTemplateLocation } = argv;
        return Promise.resolve(
          `Test: New command has been received. \ninit = ${init.toString()},\n multi-app  = ${multiApp.toString()},\n app = ${app},\n stack = ${stack},\n ymalTemplateLocation = ${yamlTemplateLocation}`
        );
      }
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  })
  .then((commandResponse) => {
    if (typeof commandResponse === "number") {
      process.exitCode = commandResponse;
    } else if (typeof commandResponse === "string") {
      console.log(commandResponse);
    } else {
      const responseWithVersionInfo = { "@guardian/cdk": { version: LibraryInfo.VERSION }, ...commandResponse };
      console.log(JSON.stringify(responseWithVersionInfo));
    }
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
