import type { AwsAccountReadiness, CliCommandResponse } from "../../../types/cli";
import { ssmParamReadiness } from "./ssm";

export const accountReadinessCommand = async (props: AwsAccountReadiness): CliCommandResponse => {
  const ssmParamReadinessResponse = await ssmParamReadiness(props);
  const vpcReadinessResponse = 1 - 1; // TODO: Implement

  if (ssmParamReadinessResponse !== 0 || vpcReadinessResponse !== 0) {
    return 1;
  } else {
    return 0;
  }
};
