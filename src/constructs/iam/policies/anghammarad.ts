import { isSingletonPresentInStack } from "../../../utils/test";
import type { GuStack } from "../../core";
import { AnghammaradTopicParameter } from "../../core/parameters/anghammarad";
import { GuAllowPolicy } from "./base-policy";

/**
 * Creates an `AWS::IAM::Policy` to grant `sns:Publish` permission to the Anghammarad topic.
 * An `AnghammaradSnsArn` parameter will be automatically added to the stack when needed.
 *
 * @see AnghammaradTopicParameter
 * @see https://github.com/guardian/anghammarad
 */
export class AnghammaradSenderPolicy extends GuAllowPolicy {
  private static instance: AnghammaradSenderPolicy | undefined;

  private constructor(scope: GuStack) {
    const anghammaradTopicParameter = AnghammaradTopicParameter.getInstance(scope);

    super(scope, "GuSESSenderPolicy", {
      actions: ["sns:Publish"],
      resources: [anghammaradTopicParameter.valueAsString],
    });
  }

  public static getInstance(stack: GuStack): AnghammaradSenderPolicy {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new AnghammaradSenderPolicy(stack);
    }

    return this.instance;
  }
}
