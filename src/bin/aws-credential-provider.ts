import { createCredentialChain, fromEnv, fromIni } from "@aws-sdk/credential-providers";
import type { AwsCredentialIdentityProvider } from "@aws-sdk/types";

export const awsCredentialProviderChain = (profile: string | undefined): AwsCredentialIdentityProvider => {
  return profile ? createCredentialChain(fromEnv(), fromIni({ profile })) : createCredentialChain(fromEnv());
};
