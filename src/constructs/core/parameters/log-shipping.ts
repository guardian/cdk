import type { GuStack } from "../stack";
import { GuStringParameter } from "./base";

export class GuLoggingStreamNameParameter extends GuStringParameter {
  private static instance: GuStringParameter | undefined;

  private constructor(scope: GuStack) {
    super(scope, "LoggingStreamName", {
      description: "SSM parameter containing the Name (not ARN) on the kinesis stream",
      default: "/account/services/logging.stream.name",
      fromSSM: true,
    });
  }

  public static getInstance(stack: GuStack): GuLoggingStreamNameParameter {
    // Resources can only live in the same App so return a new `GuSSMRunCommandPolicy` where necessary.
    // See https://github.com/aws/aws-cdk/blob/0ea4b19afd639541e5f1d7c1783032ee480c307e/packages/%40aws-cdk/core/lib/private/refs.ts#L47-L50
    const isSameStack = this.instance?.node.root === stack.node.root;

    if (!this.instance || !isSameStack) {
      this.instance = new GuLoggingStreamNameParameter(stack);
    }

    return this.instance;
  }
}
