import { SSM_PARAMETER_PATHS } from "../../../constants/ssm-parameter-paths";
import { isSingletonPresentInStack } from "../../../utils/singleton";
import type { GuStack } from "../stack";
import { GuStringParameter } from "./base";

export class GuLoggingStreamNameParameter extends GuStringParameter {
  private static instance: GuStringParameter | undefined;

  private constructor(scope: GuStack) {
    super(scope, "LoggingStreamName", {
      description: SSM_PARAMETER_PATHS.LoggingStreamName.description,
      default: SSM_PARAMETER_PATHS.LoggingStreamName.path,
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
