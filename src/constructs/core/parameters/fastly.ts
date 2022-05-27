import { CfnParameter } from "aws-cdk-lib";
import { SSM_PARAMETER_PATHS } from "../../../constants";
import { isSingletonPresentInStack } from "../../../utils/singleton";
import type { GuStack } from "../stack";

/**
 * Creates a CloudFormation parameter which contains the Fastly customer ID to use in
 * setting up a Fastly logging role. By default, the customer ID is stored in an SSM
 * Parameter called `/account/external/fastly/customer.id`.
 */
export class GuFastlyCustomerIdParameter extends CfnParameter {
  private static instance: GuFastlyCustomerIdParameter | undefined;

  private constructor(scope: GuStack) {
    super(scope, "FastlyCustomerId", {
      description: SSM_PARAMETER_PATHS.FastlyCustomerId.description,
      default: SSM_PARAMETER_PATHS.FastlyCustomerId.path,
      type: "AWS::SSM::Parameter::Value<String>",
    });
  }

  public static getInstance(stack: GuStack): GuFastlyCustomerIdParameter {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuFastlyCustomerIdParameter(stack);
    }

    return this.instance;
  }
}
