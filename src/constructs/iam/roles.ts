import type { CfnRole, RoleProps } from "@aws-cdk/aws-iam";
import { Role } from "@aws-cdk/aws-iam";
import type { GuStack } from "../core";

export interface GuRoleProps extends RoleProps {
  overrideId?: boolean;
}

export class GuRole extends Role {
  private child: CfnRole;

  constructor(scope: GuStack, id: string, props: GuRoleProps) {
    super(scope, id, props);

    this.child = this.node.defaultChild as CfnRole;
    if (props.overrideId) {
      this.child.overrideLogicalId(id);
    }
  }

  get ref(): string {
    return this.child.ref;
  }
}
