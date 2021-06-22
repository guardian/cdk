import { isSingletonPresentInStack } from "../../../utils/test";
import type { GuStack } from "../stack";
import { GuStringParameter } from "./base";

/**
 * Creates a CloudFormation parameter to a SSM Parameter Store item that holds the ARN of the Anghammarad SNS topic.
 * This parameter is implemented as a singleton, meaning only one can ever be added to a stack and will be reused if necessary.
 *
 * @see https://github.com/guardian/anghammarad
 */
export class AnghammaradTopicParameter extends GuStringParameter {
  private static instance: AnghammaradTopicParameter | undefined;

  private constructor(scope: GuStack) {
    super(scope, "AnghammaradSnsArn", {
      fromSSM: true,
      default: "/account/services/anghammarad.topic.arn",
      description: "SSM parameter containing the ARN of the Anghammarad SNS topic",
    });
  }

  /**
   * Returns a pre-existing parameter in the stack.
   * If no parameter exists, creates a new parameter.
   *
   * @param stack the stack to operate on
   */
  public static getInstance(stack: GuStack): AnghammaradTopicParameter {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new AnghammaradTopicParameter(stack);
    }

    return this.instance;
  }
}
