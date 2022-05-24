import { Role } from "aws-cdk-lib/aws-iam";
import type { RoleProps } from "aws-cdk-lib/aws-iam";
import type { GuStack } from "../../core";

export type GuRoleProps = RoleProps;

export class GuRole extends Role {
  constructor(scope: GuStack, id: string, props: GuRoleProps) {
    super(scope, id, props);
  }
}
