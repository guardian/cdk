#!/usr/bin/env node

import yargs from "yargs";
import { LibraryInfo } from "../constants";
import type { CliCommandResponse } from "../types/cli";
import { awsCredentialProviderChain } from "./aws-credential-provider";
import { accountReadinessCommand } from "./commands/account-readiness";
import { awsCdkVersionCommand } from "./commands/aws-cdk-version";
import type { PackageManager } from "./commands/new-project";
import { newCdkProject } from "./commands/new-project";

const Commands = {
  AwsCdkVersion: "aws-cdk-version",
  AccountReadiness: "account-readiness",
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
      .command(Commands.AwsCdkVersion, "Print the version of AWS CDK libraries being used")
      .command(Commands.AccountReadiness, "Perform checks on an AWS account to see if it is GuCDK ready", (yargs) =>
        yargs
          .option("profile", { type: "string", description: "AWS profile" })
          .option("region", { type: "string", description: "AWS region", default: "eu-west-1" }),
      )
      .command(
        Commands.New,
        "Creates a new CDK project within a `cdk` directory at the root of the repository",
        (yargs) =>
          yargs
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
            .option("stage", {
              description:
                "The stage(s) for your stack. Can be specified multiple times, e.g. --stage CODE --stage PROD",
              type: "array",
              demandOption: true,
            })
            .option("region", {
              description:
                "The region(s) for your stack. Can be specified multiple times, e.g. --region eu-west-1 --region us-east-1",
              type: "array",
              default: ["eu-west-1"],
            })
            .option("package-manager", {
              description:
                "The Node package manager to use. Match this to the repository (package-lock.json = npm, yarn.lock = yarn). If the repository has neither file, and there is no strong convention in your team, we recommend npm.",
              choices: ["npm", "yarn", "deno"],
              demandOption: true,
            }),
      )
      .version(
        `${LibraryInfo.VERSION} (using aws-cdk-lib ${LibraryInfo.AWS_CDK_VERSION}, constructs ${LibraryInfo.CONSTRUCTS_VERSION})`,
      )
      .demandCommand(1, "") // just print help
      .help()
      .alias("h", "help").argv,
  );
};

parseCommandLineArguments()
  .then((argv): CliCommandResponse => {
    const command = argv._[0];
    switch (command) {
      case Commands.AwsCdkVersion: {
        return awsCdkVersionCommand();
      }
      case Commands.AccountReadiness: {
        // TODO remove casting as yargs should be able to infer the type of the options
        const profile = argv.profile as string;
        const region = argv.region as string;
        return accountReadinessCommand({ credentialProvider: awsCredentialProviderChain(profile), region: region });
      }
      case Commands.New: {
        // TODO remove casting as yargs should be able to infer the type of the options
        const init = argv.init as boolean;
        const app = argv.app as string;
        const stack = argv.stack as string;
        const yamlTemplateLocation = argv["yaml-template-location"] as string | undefined;
        const stage = argv.stage as string[];
        const regions = argv.region as string[];
        const packageManager = argv["package-manager"] as string;

        const stages = stage.map((_) => _.toUpperCase());

        return newCdkProject({
          init,
          app,
          stack,
          yamlTemplateLocation,
          stages,
          regions,
          packageManager: packageManager as PackageManager,
        });
      }
      default:
        throw new Error(`Unknown command: ${command ?? ""}`);
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
