import type { CfnSecurityGroup, IPeer, SecurityGroupProps } from "@aws-cdk/aws-ec2";
import { Port, SecurityGroup } from "@aws-cdk/aws-ec2";
import type { Construct } from "@aws-cdk/core";

interface CidrIngress {
  range: IPeer;
  port?: Port;
  description?: string;
}

interface CidrEgress {
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
