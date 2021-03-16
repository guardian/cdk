import type { CfnSecurityGroup, IPeer, SecurityGroupProps } from "@aws-cdk/aws-ec2";
import { Peer, Port, SecurityGroup } from "@aws-cdk/aws-ec2";
import type { GuStack } from "../core";

/**
 * A way to describe an ingress or egress rule for a security group.
 *
 * See [[transformToSecurityGroupAccessRule]] for a handy helper function.
 */
export interface SecurityGroupAccessRule {
  /**
   * The CIDR address for this rule.
   * Use `Peer.anyIpv4()` for global access.
   */
  range: IPeer;

  /**
   * The port to open in a security group.
   * The default protocol is TCP.
   * Use `Port.udp(port)` for the UDP protocol.
   */
  port: number | Port;

  /**
   * A short explanation for this rule.
   */
  description: string;
}

export interface GuSecurityGroupProps extends SecurityGroupProps {
  overrideId?: boolean;
  ingresses?: SecurityGroupAccessRule[];
  egresses?: SecurityGroupAccessRule[];
}

/**
 * Defining an AWS Security Group with ingress and egress rules.
 *
 * An ingress rule on port 22 is strictly forbidden as SSH via SSM is preferred.
 *
 * Prefer to use a concrete implementation where possible. See:
 * - [[GuWazuhAccess]]
 * - [[GuPublicInternetAccessSecurityGroup]]
 * - [[GuHttpsEgressSecurityGroup]]
 */
export class GuSecurityGroup extends SecurityGroup {
  constructor(scope: GuStack, id: string, props: GuSecurityGroupProps) {
    super(scope, id, props);

    if (props.overrideId) {
      (this.node.defaultChild as CfnSecurityGroup).overrideLogicalId(id);
    }

    props.ingresses?.forEach(({ range, port, description }) => {
      const connection: Port = typeof port === "number" ? Port.tcp(port) : port;

      if (connection.toString() === "22") {
        throw new Error("An ingress rule on port 22 is not allowed. Prefer to setup SSH via SSM.");
      }

      this.addIngressRule(range, connection, description);
    });

    props.egresses?.forEach(({ range, port, description }) => {
      const connection: Port = typeof port === "number" ? Port.tcp(port) : port;
      this.addEgressRule(range, connection, description);
    });
  }
}

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

export class GuPublicInternetAccessSecurityGroup extends GuSecurityGroup {
  constructor(scope: GuStack, id: string, props: SecurityGroupProps) {
    super(scope, id, {
      ...props,
      ingresses: [{ range: Peer.anyIpv4(), port: 443, description: "Allow all inbound traffic via HTTPS" }],
      description: "Allow all inbound traffic via HTTPS",
    });
  }
}

export class GuHttpsEgressSecurityGroup extends GuSecurityGroup {
  constructor(scope: GuStack, id: string, props: SecurityGroupProps) {
    super(scope, id, {
      vpc: props.vpc,
      allowAllOutbound: false,
      description: "Allow all outbound HTTPS traffic",
      egresses: [{ range: Peer.anyIpv4(), port: 443, description: "Allow all outbound HTTPS traffic" }],
    });
  }

  public static forVpc(scope: GuStack, props: SecurityGroupProps): GuHttpsEgressSecurityGroup {
    return new GuHttpsEgressSecurityGroup(scope, "GuHttpsEgressSecurityGroup", props);
  }
}
