import { Peer } from "@aws-cdk/aws-ec2";
import type { GuStack } from "../../core";
import type { GuSecurityGroupProps } from "./base";
import { GuSecurityGroup } from "./base";

export class GuWazuhAccess extends GuSecurityGroup {
  private static getDefaultProps(): Partial<GuSecurityGroupProps> {
    return {
      description: "Wazuh agent registration and event logging",
      overrideId: true,
      allowAllOutbound: false,
      egresses: [
        { range: Peer.anyIpv4(), port: 1514, description: "Wazuh event logging" },
        { range: Peer.anyIpv4(), port: 1515, description: "Wazuh agent registration" },
      ],
    };
  }

  constructor(scope: GuStack, id: string, props: GuSecurityGroupProps) {
    super(scope, id, {
      ...GuWazuhAccess.getDefaultProps(),
      ...props,
    });
  }
}
