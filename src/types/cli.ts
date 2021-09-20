import type { CredentialProviderChain } from "aws-sdk";

export interface AwsAccountReadiness {
  credentialProvider: CredentialProviderChain;
  region: string;
}

// A CLI command can return...
export type CliCommandResponse = Promise<
  // ...a simple message to be printed
  | string
  // ...or a blob of JSON to be printed via `JSON.stringify`
  | Record<string, unknown>
  // ...or an exit code
  | number
>;
