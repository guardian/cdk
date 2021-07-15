import type { CredentialProviderChain } from "aws-sdk";
import AWS from "aws-sdk";

export const awsCredentialProviderChain: (profile: string | undefined) => CredentialProviderChain = (
  profile: string | undefined
) => {
  const envCredentials = () => new AWS.EnvironmentCredentials("AWS");

  return profile
    ? new AWS.CredentialProviderChain([envCredentials, () => new AWS.SharedIniFileCredentials({ profile })])
    : new AWS.CredentialProviderChain([envCredentials]);
};
