import { Peer } from "@aws-cdk/aws-ec2";
import { isSingletonPresentInStack } from "../../../utils/test";
import { GuMigratingResource } from "../../core/migrating";
import { GuBaseSecurityGroup } from "./base";
import type { GuStack } from "../../core";
import type { IVpc } from "@aws-cdk/aws-ec2";

/**
 * A security group to allow a Wazuh agent on an EC2 instance to communicate with the outside.
 * This is implemented as a singleton, meaning only one resource will be created in a stack.
 * If there are multiple apps in the stack, they will re-use this resource.
 *
 * The logicalId will always be "WazuhSecurityGroup".
 *
 * Will create a resource like this:
 *
 * ```yaml
 * WazuhSecurityGroup:
 *   Type: AWS::EC2::SecurityGroup
 *   Properties:
 *     GroupDescription: Allow outbound traffic from wazuh agent to manager
 *     VpcId:
 *       Ref: VpcId
 *     SecurityGroupEgress:
 *     - Description: Wazuh event logging
 *       IpProtocol: tcp
 *       FromPort: 1514
 *       ToPort: 1514
 *       CidrIp: 0.0.0.0/0
 *     - Description: Wazuh agent registration
 *       IpProtocol: tcp
 *       FromPort: 1515
 *       ToPort: 1515
 *       CidrIp: 0.0.0.0/0
 * ```
 *
 * Which will then get used like this:
 *
 * ```yaml
 * InstanceRoleForAppA:
 *   Type: AWS::IAM::Role
 *   Properties:
 *     SecurityGroups:
 *     - Ref: WazuhSecurityGroup
 *
 * InstanceRoleForAppB:
 *   Type: AWS::IAM::Role
 *   Properties:
 *     SecurityGroups:
 *     - Ref: WazuhSecurityGroup
 * ```
 *
 * Usage within a stack:
 * ```typescript
 * GuWazuhAccess.getInstance(this, vpc);
 * ```
 *
 * @see https://github.com/guardian/security-hq/blob/main/hq/markdown/wazuh.md
 */
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
      {
        existingLogicalId: {
          logicalId: "WazuhSecurityGroup",
          reason: "Avoid tricky security group replacement during a YAML to GuCDK migration.",
        },
      }
    );
  }

  /**
   * GuWazuhAccess is implemented as a singleton meaning only one instance will be created for the entire stack.
   * If there are multiple apps in the stack, they will re-use this resource.
   *
   * Usage:
   * ```typescript
   * GuWazuhAccess.getInstance(this, vpc);
   * ```
   *
   * @param stack the stack to add this security group to
   * @param vpc the vpc to add this security group to
   */
  public static getInstance(stack: GuStack, vpc: IVpc): GuWazuhAccess {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuWazuhAccess(stack, vpc);
    }

    return this.instance;
  }
}
