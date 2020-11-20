import type { CfnRole, RoleProps } from "@aws-cdk/aws-iam";
import { Role } from "@aws-cdk/aws-iam";
import type { Construct } from "@aws-cdk/core";

export interface GuRoleProps extends RoleProps {
  overrideId?: boolean;
}

export class GuRole extends Role {
  private static defaultProps: Partial<GuRoleProps> = {};

  private child: CfnRole;

  constructor(scope: Construct, id: string, props: GuRoleProps) {
    super(scope, id, { ...GuRole.defaultProps, ...props });

    this.child = this.node.defaultChild as CfnRole;
    if (props.overrideId) {
      this.child.overrideLogicalId(id);
    }
  }

  get ref(): string {
    return this.child.ref;
  }
}
