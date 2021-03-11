import { Peer } from "@aws-cdk/aws-ec2";
import type { CidrIngress } from "../../constructs/ec2";

export const transformToCidrIngress = (ingresses: Array<[string, string]>): CidrIngress[] => {
  return ingresses.map(([key, value]) => {
    return {
      range: Peer.ipv4(value),
      description: key,
    };
  });
};
