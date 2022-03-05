import type { IPeer, SecurityGroupProps } from "aws-cdk-lib/aws-ec2";
import { Peer, Port, SecurityGroup } from "aws-cdk-lib/aws-ec2";
import { GuMigratableConstruct } from "../../../utils/mixin";
import { GuAppAwareConstruct } from "../../../utils/mixin/app-aware-construct";
import type { AppIdentity, GuMigratingResource, GuStack } from "../../core";

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

export interface GuBaseSecurityGroupProps extends SecurityGroupProps, GuMigratingResource {
  ingresses?: SecurityGroupAccessRule[];
  egresses?: SecurityGroupAccessRule[];
}

export interface GuSecurityGroupProps extends GuBaseSecurityGroupProps, AppIdentity {}

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
export class GuBaseSecurityGroup extends GuMigratableConstruct(SecurityGroup) {
  constructor(scope: GuStack, id: string, props: GuBaseSecurityGroupProps) {
    super(scope, id, props);

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

export class GuSecurityGroup extends GuAppAwareConstruct(GuBaseSecurityGroup) {
  constructor(scope: GuStack, id: string, props: GuSecurityGroupProps) {
    super(scope, id, props);
  }
}

/**
 * Creates a security group which allows all outbound HTTPS traffic.
 */
// TODO should this be a singleton?
export class GuHttpsEgressSecurityGroup extends GuSecurityGroup {
  constructor(scope: GuStack, id: string, props: GuSecurityGroupProps) {
    super(scope, id, {
      ...props,
      allowAllOutbound: false,
      description: "Allow all outbound HTTPS traffic",
      ingresses: [],
      egresses: [{ range: Peer.anyIpv4(), port: 443, description: "Allow all outbound HTTPS traffic" }],
    });
  }

  public static forVpc(scope: GuStack, props: GuSecurityGroupProps): GuHttpsEgressSecurityGroup {
    return new GuHttpsEgressSecurityGroup(scope, "GuHttpsEgressSecurityGroup", props);
  }
}
