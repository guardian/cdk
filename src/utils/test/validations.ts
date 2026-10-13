import { Validations } from "aws-cdk-lib";
import type { GuStack } from "../../constructs/core";

/**
 * For tests only.
 * Acknowledge validation checking all CFN parameters must be used in the CFN template.
 *
 * @see https://github.com/aws-cloudformation/cfn-lint/blob/main/docs/rules.md
 */
export function acknowledgeUnusedParameters(stack: GuStack) {
  Validations.of(stack).acknowledge({
    id: "CloudFormation-Validate::W2001",
    reason: "Unit tests don't need to produce minimal CFN templates",
  });
}
