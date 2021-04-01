import type { IVpc } from "@aws-cdk/aws-ec2";
import { Peer } from "@aws-cdk/aws-ec2";
import type { GuStack } from "../../core";
import { GuSecurityGroup } from "./base";

export class GuWazuhAccess extends GuSecurityGroup {
  private static instance: GuWazuhAccess | undefined;

  private constructor(scope: GuStack, vpc: IVpc) {
    super(scope, "WazuhSecurityGroup", {
      vpc,
      description: "Wazuh agent registration and event logging",
      overrideId: true,
      allowAllOutbound: false,
      egresses: [
        { range: Peer.anyIpv4(), port: 1514, description: "Wazuh event logging" },
        { range: Peer.anyIpv4(), port: 1515, description: "Wazuh agent registration" },
      ],
    });
  }

  public static getInstance(stack: GuStack, vpc: IVpc): GuWazuhAccess {
    // Resources can only live in the same App so return a new instance where necessary.
    // See https://github.com/aws/aws-cdk/blob/0ea4b19afd639541e5f1d7c1783032ee480c307e/packages/%40aws-cdk/core/lib/private/refs.ts#L47-L50
    const isSameStack = this.instance?.node.root === stack.node.root;

    if (!this.instance || !isSameStack) {
      this.instance = new GuWazuhAccess(stack, vpc);
    }

    return this.instance;
  }
}
