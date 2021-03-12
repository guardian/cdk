import type { Port } from "@aws-cdk/aws-ec2";
import { Peer } from "@aws-cdk/aws-ec2";
import type { SecurityGroupAccessRule } from "../../constructs/ec2";

export const transformToSecurityGroupAccessRule = (
  cidrBlocks: Array<[string, string]>,
  port: Port | number
): SecurityGroupAccessRule[] => {
  return cidrBlocks.map(([key, value]) => {
    return {
      range: Peer.ipv4(value),
      description: key,
      port,
    };
  });
};
