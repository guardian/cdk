import { isSingletonPresentInStack } from "../../../utils/test";
import type { GuStack } from "../../core";
import { GuAnghammaradTopicParameter } from "../../core";
import { GuAllowPolicy } from "./base-policy";

/**
 * Creates an `AWS::IAM::Policy` to grant `sns:Publish` permission to the Anghammarad topic.
 * An `AnghammaradSnsArn` parameter will be automatically added to the stack when needed.
 *
 * @see GuAnghammaradTopicParameter
 * @see https://github.com/guardian/anghammarad
 */
export class GuAnghammaradSenderPolicy extends GuAllowPolicy {
  private static instance: GuAnghammaradSenderPolicy | undefined;

  private constructor(scope: GuStack) {
    const anghammaradTopicParameter = GuAnghammaradTopicParameter.getInstance(scope);

    super(scope, "GuAnghammaradSenderPolicy", {
      actions: ["sns:Publish"],
      resources: [anghammaradTopicParameter.valueAsString],
    });
  }

  public static getInstance(stack: GuStack): GuAnghammaradSenderPolicy {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuAnghammaradSenderPolicy(stack);
    }

    return this.instance;
  }
}
