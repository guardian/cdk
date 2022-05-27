import { Role } from "aws-cdk-lib/aws-iam";
import type { RoleProps } from "aws-cdk-lib/aws-iam";
import type { GuApp } from "../../core";

export type GuRoleProps = RoleProps;

export class GuRole extends Role {
  constructor(scope: GuApp, id: string, props: GuRoleProps) {
    super(scope, id, props);
  }
}
