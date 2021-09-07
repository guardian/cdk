import { SSM_PARAMETER_PATHS } from "../../../constants/ssm-parameter-paths";
import { isSingletonPresentInStack } from "../../../utils/singleton";
import type { GuStack } from "../stack";
import { GuParameter } from "./base";
import type { GuNoTypeParameterProps } from "./base";

export class GuSubnetListParameter extends GuParameter {
  constructor(scope: GuStack, id: string, props: GuNoTypeParameterProps) {
    super(scope, id, { ...props, type: "List<AWS::EC2::Subnet::Id>" });
  }
}

/**
 * Adds a "VpcId" parameter to a stack.
 * This parameter will read from Parameter Store.
 * By default it will read from `/account/vpc/primary/id`, this can be changed at runtime if needed.
 */
export class GuVpcParameter extends GuParameter {
  private static instance: GuVpcParameter | undefined;

  private constructor(scope: GuStack) {
    super(scope, "VpcId", {
      description: SSM_PARAMETER_PATHS.PrimaryVpcId.description,
      default: SSM_PARAMETER_PATHS.PrimaryVpcId.path,
      type: "AWS::EC2::VPC::Id",
      fromSSM: true,
    });
  }

  public static getInstance(stack: GuStack): GuVpcParameter {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuVpcParameter(stack);
    }

    return this.instance;
  }
}
