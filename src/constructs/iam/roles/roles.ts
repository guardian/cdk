import type { RoleProps } from "aws-cdk-lib/aws-iam";
import { Role } from "aws-cdk-lib/aws-iam";
import { GuMigratableConstruct } from "../../../utils/mixin";
import type { GuMigratingResource, GuStack } from "../../core";

export interface GuRoleProps extends RoleProps, GuMigratingResource {}

export class GuRole extends GuMigratableConstruct(Role) {
  constructor(scope: GuStack, id: string, props: GuRoleProps) {
    super(scope, id, props);
  }
}
