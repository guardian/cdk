import type { AwsAccountReadiness, CliCommandResponse } from "../../../types/cli";
import { ssmParamReadiness } from "./ssm";

export const accountReadinessCommand = async (props: AwsAccountReadiness): CliCommandResponse => {
  // Got a new AWS account readiness command? Add it to this list and ✨
  const commandResponses: number[] = await Promise.all([ssmParamReadiness(props)]);

  const totalFailedCommands = commandResponses.filter((_) => _ !== 0);
  const allCommandsSuccessful = totalFailedCommands.length === 0;

  return allCommandsSuccessful ? 0 : 1;
};
