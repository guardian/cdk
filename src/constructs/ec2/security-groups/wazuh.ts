import type { IVpc } from "@aws-cdk/aws-ec2";
import { Peer } from "@aws-cdk/aws-ec2";
import type { GuStack } from "../../core";
import { GuMigratingResource } from "../../core/migrating";
import { GuBaseSecurityGroup } from "./base";

export class GuWazuhAccess extends GuBaseSecurityGroup {
  private static instance: GuWazuhAccess | undefined;

  private constructor(scope: GuStack, vpc: IVpc) {
    super(scope, "WazuhSecurityGroup", {
      vpc,

      /*
      The group description of a security group is stateful.
      Be careful about changing this!

      See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group.html#cfn-ec2-securitygroup-groupdescription
       */
      description: "Allow outbound traffic from wazuh agent to manager",
      allowAllOutbound: false,
      egresses: [
        { range: Peer.anyIpv4(), port: 1514, description: "Wazuh event logging" },
        { range: Peer.anyIpv4(), port: 1515, description: "Wazuh agent registration" },
      ],
    });

    /*
    Replacing in-use security groups is difficult as it requires careful orchestration with instances.
    Fix the logicalId to "WazuhSecurityGroup" regardless of new or migrating stack.
    This makes it:
      - easier for YAML defined stacks to move to GuCDK as the resource will be kept
      - easier for stacks already using GuCDK to upgrade versions
     */
    GuMigratingResource.setLogicalId(
      this,
      { migratedFromCloudFormation: true },
      { existingLogicalId: "WazuhSecurityGroup" }
    );
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
