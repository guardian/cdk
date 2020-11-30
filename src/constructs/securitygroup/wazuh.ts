import { Peer, Port } from "@aws-cdk/aws-ec2";
import type { GuStack } from "../core";
import { GuSecurityGroup } from "../ec2";
import type { GuSecurityGroupProps } from "../ec2";

export class GuWazuhAccess extends GuSecurityGroup {
  private static getDefaultProps(): Partial<GuSecurityGroupProps> {
    return {
      description: "Wazuh agent registration and event logging",
      overrideId: true,
      allowAllOutbound: false,
      egresses: [
        { range: Peer.anyIpv4(), port: Port.tcp(1514), description: "wazuh event logging" },
        { range: Peer.anyIpv4(), port: Port.tcp(1515), description: "wazuh agent registration" },
      ],
    };
  }

  constructor(scope: GuStack, id: string = "WazuhSecurityGroup", props: GuSecurityGroupProps) {
    super(scope, id, {
      ...GuWazuhAccess.getDefaultProps(),
      ...props,
    });
  }
}
