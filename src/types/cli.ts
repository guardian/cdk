import type { CredentialProviderChain } from "aws-sdk";
import type { SubnetList, Vpc } from "aws-sdk/clients/ec2";

export interface AwsAccountReadiness {
  credentialProvider: CredentialProviderChain;
  region: string;
  fix: boolean;
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

export interface VpcInDetail extends Vpc {
  subnets: SubnetList;
  isUsed: boolean;
}
