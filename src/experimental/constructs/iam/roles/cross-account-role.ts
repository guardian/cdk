import { ArnPrincipal } from "aws-cdk-lib/aws-iam";
import type { GuStack } from "../../../../constructs/core";
import type { GuRoleProps } from "../../../../constructs/iam";
import { GuRole } from "../../../../constructs/iam";

export interface GuCrossAccountRoleExperimentalProps extends Omit<GuRoleProps, "assumedBy"> {
  /**
   * The name of the role that will assume this new GuCrossAccountRoleExperimental.
   * It should be the full name including the stage (if appropriate).
   */
  nameOfRoleWhichCanAssumeThisRole: string;

  /**
   * The AWS account ID associated with the resource that will consume this new GuCrossAccountRoleExperimental.
   *
   * If this construct is being used on a public repo it would be advisable to use
   * [private-infrastructure-config](https://github.com/guardian/private-infrastructure-config) so that any account ID
   * is not publicly available.
   */
  accountId: string;
}

/**
 * A construct to create a cross account role.
 *
 * In order to use this construct the name of the role that will assume this cross account role must be provided, along
 * with the corresponding AWS account ID of the assuming role.
 *
 * The resulting role can only be assumed by the specified role in the given AWS account. When this role has been
 * created it can be extended to grant permissions for specific actions, allowing a resource in one AWS account to
 * perform actions in another.
 */
export class GuCrossAccountRoleExperimental extends GuRole {
  constructor(scope: GuStack, id: string, props: GuCrossAccountRoleExperimentalProps) {
    const { nameOfRoleWhichCanAssumeThisRole, accountId } = props;

    super(scope, id, {
      assumedBy: new ArnPrincipal(`arn:aws:iam::${accountId}:role/${nameOfRoleWhichCanAssumeThisRole}`),
      ...props,
    });
  }
}
