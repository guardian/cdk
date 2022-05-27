import { CfnParameter } from "aws-cdk-lib";
import { SSM_PARAMETER_PATHS } from "../../../constants";
import { isSingletonPresentInStack } from "../../../utils/singleton";
import type { GuStack } from "../stack";

/**
 * Creates a CloudFormation parameter to a SSM Parameter Store item that holds the ARN of the Anghammarad SNS topic.
 * This parameter is implemented as a singleton, meaning only one can ever be added to a stack and will be reused if necessary.
 *
 * @see https://github.com/guardian/anghammarad
 */
export class GuAnghammaradTopicParameter extends CfnParameter {
  private static instance: GuAnghammaradTopicParameter | undefined;

  private constructor(scope: GuStack) {
    super(scope, "AnghammaradSnsArn", {
      type: "AWS::SSM::Parameter::Value<String>",
      default: SSM_PARAMETER_PATHS.Anghammarad.path,
      description: SSM_PARAMETER_PATHS.Anghammarad.description,
    });
  }

  /**
   * Returns a pre-existing parameter in the stack.
   * If no parameter exists, creates a new parameter.
   *
   * @param stack the stack to operate on
   */
  public static getInstance(stack: GuStack): GuAnghammaradTopicParameter {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuAnghammaradTopicParameter(stack);
    }

    return this.instance;
  }
}
