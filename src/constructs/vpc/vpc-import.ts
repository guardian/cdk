import { Aws, Fn, Token } from "aws-cdk-lib";
import type { ISubnet, IVpc } from "aws-cdk-lib/aws-ec2";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { isSingletonPresentInStack } from "../../utils/singleton";
import type { GuStack } from "../core";
import { GuVpcParameter, GuVpcPrivateSubnetsParameter, GuVpcPublicSubnetsParameter } from "../core";

/**
 * A singleton class that imports a VPC, including the public and private subnets, from SSM Parameters.
 *
 * By default, the following SSM Parameters are used:
 * - [`/account/vpc/primary/id` for the VPC ID]{@link GuVpcParameter}
 * - [`/account/vpc/primary/subnets/public` for the public subnets]{@link GuVpcPublicSubnetsParameter}
 * - [`/account/vpc/primary/subnets/private` for the private subnets]{@link GuVpcPrivateSubnetsParameter}
 *
 * Account VPCs and related SSM Parameters are managed in https://github.com/guardian/aws-account-setup.
 */
export class GuVpcImport {
  // This property wouldn't really be used, but its necessary for the singleton implementation.
  public readonly stack: GuStack;

  /**
   * The imported VPC.
   */
  public readonly vpc: IVpc;

  /**
   * The imported public subnets.
   * This property can also be read from the [vpc]{@link GuVpcImport#vpc} property.
   */
  public readonly publicSubnets: ISubnet[];

  /**
   * The imported private subnets.
   * This property can also be read from the [vpc]{@link GuVpcImport#vpc} property.
   */
  public readonly privateSubnets: ISubnet[];

  private static instance: GuVpcImport | undefined;

  private constructor(scope: GuStack, vpc: IVpc) {
    const { publicSubnets, privateSubnets } = vpc;

    this.stack = scope;

    this.vpc = vpc;
    this.publicSubnets = publicSubnets;
    this.privateSubnets = privateSubnets;
  }

  /**
   * Imports a VPC (including the public and private subnets) from SSM Parameters.
   */
  static fromSsmParameters(stack: GuStack): GuVpcImport {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      const vpcId = GuVpcParameter.getInstance(stack).valueAsString;
      const publicSubnetIds = GuVpcPublicSubnetsParameter.getInstance(stack).valueAsList;
      const privateSubnetIds = GuVpcPrivateSubnetsParameter.getInstance(stack).valueAsList;

      const vpc = Vpc.fromVpcAttributes(stack, "VpcImport", {
        /*
        AWS CDK requires this property to be set.
        We're pulling the subnets from SSM Parameters at runtime into s list.
        At compile time, we can only assert the list has 1 item (though in reality, we know it has 3 items).
        AWS CDK wants `publicSubnetIds` and `privateSubnetIds` to be a multiple of `availabilityZones`.

        If we were to use the dynamic value of `scope.availabilityZones` we get the error:
          > Error: Number of privateSubnetIds (1) must be a multiple of availability zones (2).

        Set the number of AZs to 1 to avoid the error.
        */
        availabilityZones: [Aws.NO_VALUE],

        vpcId,
        publicSubnetIds,
        privateSubnetIds,
      });

      this.instance = new GuVpcImport(stack, vpc);
    }

    return this.instance;
  }

  /**
   * Imports a VPC from the `eu-west-1` region (including the public and private subnets) from SSM Parameters.
   * Use this if you need to know the availability zones of the VPC at compile time.
   *
   * IMPORTANT: The order of the subnets in the SSM Parameters must match the order of the availability zones.
   * Prefer [fromSsmParameters]{@link GuVpcImport#fromSsmParameters}.
   */
  static fromSsmParametersRegional(stack: GuStack): GuVpcImport {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      const { region } = stack;

      if (Token.isUnresolved(region) || region !== "eu-west-1") {
        throw new Error("This function is only supported in the eu-west-1 region");
      }

      const availabilityZones = ["eu-west-1a", "eu-west-1b", "eu-west-1c"];

      const vpcId = GuVpcParameter.getInstance(stack).valueAsString;
      const publicSubnetIds = GuVpcPublicSubnetsParameter.getInstance(stack).valueAsList;
      const privateSubnetIds = GuVpcPrivateSubnetsParameter.getInstance(stack).valueAsList;

      const vpc = Vpc.fromVpcAttributes(stack, "VpcImport", {
        availabilityZones,
        vpcId,
        publicSubnetIds: availabilityZones.map((_, index) => Fn.select(index, publicSubnetIds)),
        privateSubnetIds: availabilityZones.map((_, index) => Fn.select(index, privateSubnetIds)),
      });

      this.instance = new GuVpcImport(stack, vpc);
    }

    return this.instance;
  }
}
