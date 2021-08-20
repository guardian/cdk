import { SSM_PARAMETER_PATHS } from "../../../constants/ssm-parameter-paths";
import { isSingletonPresentInStack } from "../../../utils/test";
import type { GuStack } from "../stack";
import { GuStringParameter } from "./base";

/**
 * Creates a CloudFormation parameter which references the bucket used to store code artifacts.
 * By default, the bucket name is stored in an SSM Parameter called `/account/services/artifact.bucket`.
 */
export class GuFastlyCustomerIdParameter extends GuStringParameter {
  private static instance: GuFastlyCustomerIdParameter | undefined;

  private constructor(scope: GuStack) {
    super(scope, "FastlyCustomerId", {
      description: SSM_PARAMETER_PATHS.FastlyCustomerId.description,
      default: SSM_PARAMETER_PATHS.FastlyCustomerId.path,
      fromSSM: true,
    });
  }

  public static getInstance(stack: GuStack): GuFastlyCustomerIdParameter {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuFastlyCustomerIdParameter(stack);
    }

    return this.instance;
  }
}
