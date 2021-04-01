import type { GuStack } from "../../core";
import { GuLoggingStreamNameParameter } from "../../core/parameters/log-shipping";
import { GuAllowPolicy } from "./base-policy";

export class GuLogShippingPolicy extends GuAllowPolicy {
  private static instance: GuLogShippingPolicy | undefined;

  private constructor(scope: GuStack) {
    super(scope, "GuLogShippingPolicy", {
      actions: ["kinesis:Describe*", "kinesis:Put*"],
      resources: [
        `arn:aws:kinesis:${scope.region}:${scope.account}:stream/${
          GuLoggingStreamNameParameter.getInstance(scope).valueAsString
        }`,
      ],
    });
  }

  public static getInstance(stack: GuStack): GuLogShippingPolicy {
    // Resources can only live in the same App so return a new instance where necessary.
    // See https://github.com/aws/aws-cdk/blob/0ea4b19afd639541e5f1d7c1783032ee480c307e/packages/%40aws-cdk/core/lib/private/refs.ts#L47-L50
    const isSameStack = this.instance?.node.root === stack.node.root;

    if (!this.instance || !isSameStack) {
      this.instance = new GuLogShippingPolicy(stack);
    }

    return this.instance;
  }
}
