import type { CfnSecurityGroup, IPeer, SecurityGroupProps } from "@aws-cdk/aws-ec2";
import { Peer, Port, SecurityGroup } from "@aws-cdk/aws-ec2";
import type { Construct } from "@aws-cdk/core";

export interface CidrIngress {
  range: IPeer;
  port?: Port;
  description?: string;
}

export interface CidrEgress {
  range: IPeer;
  port: Port;
  description?: string;
}

export const transformToCidrIngress = (ingresses: Array<[string, string]>): CidrIngress[] => {
  return ingresses.map(([key, value]) => {
    return {
      range: Peer.ipv4(value),
      description: key,
    };
  });
};

export interface GuSecurityGroupProps extends SecurityGroupProps {
  overrideId?: boolean;
  ingresses?: CidrIngress[];
  egresses?: CidrEgress[];
}

export class GuSecurityGroup extends SecurityGroup {
  constructor(scope: Construct, id: string, props: GuSecurityGroupProps) {
    super(scope, id, props);

    if (props.overrideId) {
      (this.node.defaultChild as CfnSecurityGroup).overrideLogicalId(id);
    }

    props.ingresses?.forEach(({ range, description, port }) =>
      this.addIngressRule(range, port ?? Port.tcp(443), description ?? undefined)
    );

    props.egresses?.forEach(({ range, description, port }) =>
      this.addEgressRule(range, port, description ?? undefined)
    );
  }
}
