import type { CfnSecurityGroup, IPeer, SecurityGroupProps } from "@aws-cdk/aws-ec2";
import { Port, SecurityGroup } from "@aws-cdk/aws-ec2";
import type { Construct } from "@aws-cdk/core";

export interface CidrIngress {
  range: IPeer;
  description: string;
}

export interface CidrEgress {
  range: IPeer;
  port: Port;
  description?: string;
}

export interface GuSecurityGroupProps extends SecurityGroupProps {
  overrideId?: boolean;
  ingresses?: CidrIngress[];
  egresses?: CidrEgress[];
}

export class GuSecurityGroup extends SecurityGroup {
  static defaultIngressPort = Port.tcp(443);

  constructor(scope: Construct, id: string, props: GuSecurityGroupProps) {
    super(scope, id, props);

    if (props.overrideId) {
      (this.node.defaultChild as CfnSecurityGroup).overrideLogicalId(id);
    }

    props.ingresses?.forEach(({ range, description }) =>
      this.addIngressRule(range, GuSecurityGroup.defaultIngressPort, description)
    );

    props.egresses?.forEach(({ range, description, port }) =>
      this.addEgressRule(range, port, description ?? undefined)
    );
  }
}
