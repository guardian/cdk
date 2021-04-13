import type { CfnRole, RoleProps } from "@aws-cdk/aws-iam";
import { Role } from "@aws-cdk/aws-iam";
import { GuMigratableConstruct } from "../../../utils/mixin";
import type { GuStack } from "../../core";
import type { GuMigratingResource } from "../../core/migrating";

export interface GuRoleProps extends RoleProps, GuMigratingResource {}

export class GuRole extends GuMigratableConstruct(Role) {
  private child: CfnRole;

  constructor(scope: GuStack, id: string, props: GuRoleProps) {
    super(scope, id, props);

    this.child = this.node.defaultChild as CfnRole;
  }

  // TODO is this needed? We don't do this in other constructs...
  get ref(): string {
    return this.child.ref;
  }
}
