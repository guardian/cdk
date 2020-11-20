import type { CfnSecurityGroup, SecurityGroupProps } from "@aws-cdk/aws-ec2";
import { SecurityGroup } from "@aws-cdk/aws-ec2";
import type { Construct } from "@aws-cdk/core";

export interface GuSecurityGroupProps extends SecurityGroupProps {
  overrideId?: boolean;
}

export class GuSecurityGroup extends SecurityGroup {
  constructor(scope: Construct, id: string, props: GuSecurityGroupProps) {
    super(scope, id, props);

    if (props.overrideId) {
      (this.node.defaultChild as CfnSecurityGroup).overrideLogicalId(id);
    }
  }
}
