import { isSingletonPresentInStack } from "../../../utils/test";
import { GuStringParameter } from "./base";
import type { GuStack } from "../stack";

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
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuLoggingStreamNameParameter(stack);
    }

    return this.instance;
  }
}
