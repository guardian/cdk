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
      .option("profile", { type: "string", description: "AWS profile" })
      .option("region", { type: "string", description: "AWS region", default: "eu-west-1" })
      .command(Commands.AwsCdkVersion, "Print the version of @aws-cdk libraries being used")
      .command(Commands.AccountReadiness, "Perform checks on an AWS account to see if it is GuCDK ready")
      .command(Commands.CheckPackageJson, "Check a package.json file for compatibility with GuCDK", (yargs) =>
        yargs.option("directory", {
          type: "string",
          description: "The location of the package.json file to check",
          default: process.cwd(),
          defaultDescription: "The current working directory",
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
    const { profile, region } = argv;
    switch (command) {
      case Commands.AwsCdkVersion:
        return awsCdkVersionCommand();
      case Commands.AccountReadiness:
        return accountReadinessCommand({ credentialProvider: awsCredentialProviderChain(profile), region });
      case Commands.CheckPackageJson: {
        const { directory } = argv;
        return checkPackageJson(directory);
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
