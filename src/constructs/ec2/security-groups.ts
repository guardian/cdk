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
        { range: Peer.anyIpv4(), port: 1514, description: "wazuh event logging" },
        { range: Peer.anyIpv4(), port: 1515, description: "wazuh agent registration" },
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
      ingresses: [{ range: Peer.anyIpv4(), port: 443, description: "Allows internet access on 443" }],
      description: "Allows internet access on 443",
    });
  }
}

export class GuHttpsEgressSecurityGroup extends GuSecurityGroup {
  constructor(scope: GuStack, id: string, props: SecurityGroupProps) {
    super(scope, id, {
      vpc: props.vpc,
      allowAllOutbound: false,
      description: "Allow all outbound traffic on port 443",
      egresses: [{ range: Peer.anyIpv4(), port: 443, description: "Allow all outbound traffic on port 443" }],
    });
  }

  public static forVpc(scope: GuStack, props: SecurityGroupProps): GuHttpsEgressSecurityGroup {
    return new GuHttpsEgressSecurityGroup(scope, "GuHttpsEgressSecurityGroup", props);
  }
}
