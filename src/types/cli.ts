import type { Subnet, Vpc } from "@aws-sdk/client-ec2";
import type { AwsCredentialIdentityProvider } from "@aws-sdk/types";

export interface AwsConfig {
  credentialProvider: AwsCredentialIdentityProvider;
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

export interface VpcInDetail extends Vpc {
  subnets: Subnet[];
  isUsed: boolean;
}
