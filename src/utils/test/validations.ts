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

/**
 * For tests only.
 * Acknowledge validation checking `Resources` section must exist and be non-empty.
 *
 * @see https://github.com/aws-cloudformation/cfn-lint/blob/main/docs/rules.md
 */
export function acknowledgeEmptyTemplate(stack: GuStack) {
  Validations.of(stack).acknowledge({
    id: "CloudFormation-Validate::F0001",
    reason: "Unit tests don't need to a non-empty CFN template",
  });
}
