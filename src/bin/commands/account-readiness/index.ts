import type { CredentialProviderChain } from "aws-sdk";
import type { CliCommandResponse } from "../../../types/command";
import { ssmParamReadiness } from "./ssm";

export const accountReadinessCommand = async ({
  credentialProvider,
  region,
}: {
  credentialProvider: CredentialProviderChain;
  region: string;
}): CliCommandResponse => {
  const ssmParamReadinessResponse = await ssmParamReadiness({ credentialProvider, region });
  const vpcReadinessResponse = 1 - 1; // TODO: Implement

  if (ssmParamReadinessResponse !== 0 || vpcReadinessResponse !== 0) {
    return 1;
  } else {
    return 0;
  }
};
