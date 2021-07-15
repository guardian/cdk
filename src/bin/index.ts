#!/usr/bin/env node

import yargs from "yargs";
import { LibraryInfo } from "../constants/library-info";
import { awsCdkVersionCommand } from "./commands/aws-cdk-version";

const Commands = {
  AwsCdkVersion: "aws-cdk-version",
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
      .option("verbose", { type: "boolean", default: false, description: "Show verbose output" })
      .command(Commands.AwsCdkVersion, "Print the version of @aws-cdk libraries being used")
      .version(`${LibraryInfo.VERSION} (using @aws-cdk ${LibraryInfo.AWS_CDK_VERSION})`)
      .demandCommand(1, "") // just print help
      .help()
      .alias("h", "help").argv
  );
};

// A CLI command can return...
type CliCommandResponse = Promise<
  // ...a simple message to be printed
  | string
  // ...or a blob of JSON to be printed via `JSON.stringify`
  | Record<string, unknown>
  // ...or an exit code
  | number
>;

parseCommandLineArguments()
  .then((argv): CliCommandResponse => {
    const command = argv._[0];
    const { verbose } = argv;
    switch (command) {
      case Commands.AwsCdkVersion:
        return awsCdkVersionCommand(verbose);
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
      console.log(JSON.stringify(commandResponse));
    }
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
