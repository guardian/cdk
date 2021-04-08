import type { CfnRole, RoleProps } from "@aws-cdk/aws-iam";
import { Role } from "@aws-cdk/aws-iam";
import type { GuStack } from "../../core";
import { GuMigratingResource } from "../../core/migrating";

export interface GuRoleProps extends RoleProps, GuMigratingResource {}

export class GuRole extends Role {
  private child: CfnRole;

  constructor(scope: GuStack, id: string, props: GuRoleProps) {
    super(scope, id, props);
    GuMigratingResource.setLogicalId(this, scope, props);

    this.child = this.node.defaultChild as CfnRole;
  }

  get ref(): string {
    return this.child.ref;
  }
}
