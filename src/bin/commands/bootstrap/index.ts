import chalk from "chalk";
import { ALL_SSM_PARAMETER_PATHS } from "../../../constants";
import type { AwsBootstrap, CliCommandResponse } from "../../../types/cli";
import { accountBootstrapCfn, createBootstrapStack } from "./bootstrap-stack";

export const bootstrapCommand = async (props: AwsBootstrap): CliCommandResponse => {
  const tpl = await accountBootstrapCfn(ALL_SSM_PARAMETER_PATHS);

  if (props.dryRun) {
    console.log(tpl);
    return 0;
  }

  const stackName = await createBootstrapStack(props, tpl);
  console.log(`Create is ${chalk.bold("IN PROGRESS")} for '${stackName}'...`);
  console.log("Go to the AWS Cloudformation Console to confirm that the stack creation completed successfully.");
  console.log();
  console.log(
    "We recommend not committing the stack template into VCS. Instead, consider @guardian/cdk as the canonical source and re-run the bootstrap command to re-create or update as required in the future."
  );

  return 0;
};
