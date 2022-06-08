#!/usr/bin/env node

import yargs from "yargs";
import { LibraryInfo } from "../constants";
import type { CliCommandResponse } from "../types/cli";
import { awsCredentialProviderChain } from "./aws-credential-provider";
import { accountReadinessCommand } from "./commands/account-readiness";
import { awsCdkVersionCommand } from "./commands/aws-cdk-version";
import { bootstrapCommand } from "./commands/bootstrap";
import { newProjectCommand } from "./commands/new-project";

const Commands = {
  AwsCdkVersion: "aws-cdk-version",
  AccountReadiness: "account-readiness",
  New: "new",
  Bootstrap: "bootstrap",
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
      .command(Commands.AwsCdkVersion, "Print the version of AWS CDK libraries being used")
      .command(Commands.Bootstrap, "Bootstrap an AWS account for @guardian/cdk", (yargs) =>
        yargs
          .option("profile", {
            type: "string",
            description: "AWS profile",
            demandOption: true,
          })
          .option("dry-run", {
            type: "boolean",
            description: "If set, AWS stack will not be created but the template will be printed to stdout.",
          })
          .option("region", { type: "string", description: "AWS region", default: "eu-west-1" })
      )
      .command(Commands.AccountReadiness, "Perform checks on an AWS account to see if it is GuCDK ready", (yargs) =>
        yargs
          .option("profile", { type: "string", description: "AWS profile" })
          .option("region", { type: "string", description: "AWS region", default: "eu-west-1" })
      )
      .command(Commands.New, "Creates a new CDK project within a `cdk` directory at the root of the repository")
      .version(
        `${LibraryInfo.VERSION} (using aws-cdk-lib ${LibraryInfo.AWS_CDK_VERSION}, constructs ${LibraryInfo.CONSTRUCTS_VERSION})`
      )
      .demandCommand(1, "") // just print help
      .help()
      .alias("h", "help").argv
  );
};

parseCommandLineArguments()
  .then((argv): CliCommandResponse => {
    const command = argv._[0];
    switch (command) {
      case Commands.AwsCdkVersion: {
        return awsCdkVersionCommand();
      }
      case Commands.Bootstrap: {
        const { profile, region, dryRun } = argv;
        return bootstrapCommand({
          credentialProvider: awsCredentialProviderChain(profile),
          dryRun: dryRun ?? false,
          region,
        });
      }
      case Commands.AccountReadiness: {
        const { profile, region } = argv;
        return accountReadinessCommand({ credentialProvider: awsCredentialProviderChain(profile), region });
      }
      case Commands.New: {
        return newProjectCommand();
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
