import { CfnParameter } from "aws-cdk-lib";
import { NAMED_SSM_PARAMETER_PATHS } from "../../../constants";
import { isSingletonPresentInStack } from "../../../utils/singleton";
import type { GuStack } from "../stack";

/**
 * A CloudFormation parameter referencing an SSM Parameter holding the VPC ID.
 * The parameter name is `VpcId` and default value `/account/vpc/primary/id`.
 *
 * The default value can be changed if needed:
 *
 * ```typescript
 * const vpcIdParameter = GuVpcParameter.getInstance(this);
 * vpcIdParameter.default = "/account/vpc/secondary/id";
 * ```
 */
export class GuVpcParameter extends CfnParameter {
  private static instance: GuVpcParameter | undefined;

  private constructor(scope: GuStack) {
    super(scope, "VpcId", {
      description: NAMED_SSM_PARAMETER_PATHS.PrimaryVpcId.description,
      default: NAMED_SSM_PARAMETER_PATHS.PrimaryVpcId.path,
      type: "AWS::SSM::Parameter::Value<AWS::EC2::VPC::Id>",
    });
  }

  public static getInstance(stack: GuStack): GuVpcParameter {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuVpcParameter(stack);
    }

    return this.instance;
  }
}

/**
 * A CloudFormation parameter referencing an SSM Parameter holding the VPC private subnets.
 * The parameter name is `VpcPrivateSubnets` and default value `/account/vpc/primary/subnets/private`.
 *
 * The default value can be changed if needed:
 *
 * ```typescript
 * const vpcPrivateSubnetsParameter = GuVpcPrivateSubnetsParameter.getInstance(this);
 * vpcPrivateSubnetsParameter.default = "/account/vpc/secondary/subnets/private";
 * ```
 */
export class GuVpcPrivateSubnetsParameter extends CfnParameter {
  private static instance: GuVpcPrivateSubnetsParameter | undefined;

  private constructor(scope: GuStack) {
    super(scope, "VpcPrivateSubnets", {
      description: NAMED_SSM_PARAMETER_PATHS.PrimaryVpcPrivateSubnets.description,
      default: NAMED_SSM_PARAMETER_PATHS.PrimaryVpcPrivateSubnets.path,
      type: "AWS::SSM::Parameter::Value<List<AWS::EC2::Subnet::Id>>",
    });
  }

  public static getInstance(stack: GuStack): GuVpcPrivateSubnetsParameter {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuVpcPrivateSubnetsParameter(stack);
    }

    return this.instance;
  }
}

/**
 * A CloudFormation parameter referencing an SSM Parameter holding the VPC public subnets.
 * The parameter name is `VpcPublicSubnets` and default value `/account/vpc/primary/subnets/public`.
 *
 * The default value can be changed if needed:
 *
 * ```typescript
 * const vpcPublicSubnetsParameter = GuVpcPublicSubnetsParameter.getInstance(this);
 * vpcPublicSubnetsParameter.default = "/account/vpc/secondary/subnets/public";
 * ```
 */
export class GuVpcPublicSubnetsParameter extends CfnParameter {
  private static instance: GuVpcPublicSubnetsParameter | undefined;

  private constructor(scope: GuStack) {
    super(scope, "VpcPublicSubnets", {
      description: NAMED_SSM_PARAMETER_PATHS.PrimaryVpcPublicSubnets.description,
      default: NAMED_SSM_PARAMETER_PATHS.PrimaryVpcPublicSubnets.path,
      type: "AWS::SSM::Parameter::Value<List<AWS::EC2::Subnet::Id>>",
    });
  }

  public static getInstance(stack: GuStack): GuVpcPublicSubnetsParameter {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuVpcPublicSubnetsParameter(stack);
    }

    return this.instance;
  }
}
