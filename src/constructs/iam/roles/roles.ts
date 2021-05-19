import { Role } from "@aws-cdk/aws-iam";
import { GuMigratableConstruct } from "../../../utils/mixin";
import type { GuStack } from "../../core";
import type { GuMigratingResource } from "../../core/migrating";
import type { RoleProps } from "@aws-cdk/aws-iam";

export interface GuRoleProps extends RoleProps, GuMigratingResource {}

export class GuRole extends GuMigratableConstruct(Role) {
  constructor(scope: GuStack, id: string, props: GuRoleProps) {
    super(scope, id, props);
  }
}
