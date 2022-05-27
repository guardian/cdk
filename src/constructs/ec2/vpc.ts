import { Subnet, Vpc } from "aws-cdk-lib/aws-ec2";
import type { ISubnet, IVpc, VpcAttributes } from "aws-cdk-lib/aws-ec2";
import { GuSubnetListParameter, GuVpcParameter } from "../core";
import type { GuApp, GuStack } from "../core";

interface VpcFromIdProps extends Omit<VpcAttributes, "availabilityZones"> {
  availabilityZones?: string[];
}

type VpcFromIdParameterProps = Omit<VpcFromIdProps, "vpcId">;

// TODO convert to boolean
export enum SubnetType {
  PUBLIC = "Public",
  PRIVATE = "Private",
}

export class GuVpc {
  static subnets(scope: GuStack, subnets: string[]): ISubnet[] {
    /**
     *  As of ~1.77.0 of the aws/cdk, this line
     * [ previously Subnet.fromSubnetId(scope, `subnet-${subnetId}`, subnetId)) ]
     * resulted in the following error
     * "Found an encoded list token string in a scalar string context. Use 'Fn.select(0, list)' (not 'list[0]') to extract elements from token lists."
     * See https://github.com/aws/aws-cdk/issues/11945 for more information
     *
     * As a hacky workaround, we have moved to using the fromSubnetAttributes method and hardcoded an empty value
     * for the routeTableId prop. This prevents the error and, when tested on existing stacks, results in no change to the CFN output
     *
     * TODO: Understand VPCs and Subnets better and develop a better solution to this problem
     */
    return subnets.map((subnetId) =>
      Subnet.fromSubnetAttributes(scope, `subnet-${subnetId}`, { subnetId, routeTableId: " " })
    );
  }

  static subnetsFromParameter(scope: GuApp, type: SubnetType = SubnetType.PRIVATE): ISubnet[] {
    const subnets = new GuSubnetListParameter(scope, `${scope.app}${type}Subnets`, {
      description: `A list of ${type.toLowerCase()} subnets`,

      // TODO use `SSM_PARAMETER_PATHS.PrimaryVpcPrivateSubnets` or `SSM_PARAMETER_PATHS.PrimaryVpcPublicSubnets`
      default: `/account/vpc/primary/subnets/${type.toLowerCase()}`,
      fromSSM: true,
    });

    return GuVpc.subnets(scope.parent, subnets.valueAsList);
  }

  static fromId(scope: GuStack, id: string, props: VpcFromIdProps): IVpc {
    return Vpc.fromVpcAttributes(scope, id, {
      availabilityZones: scope.availabilityZones,
      ...props,
    });
  }

  static fromIdParameter(scope: GuStack, id: string, props?: VpcFromIdParameterProps): IVpc {
    const vpc = GuVpcParameter.getInstance(scope);
    return GuVpc.fromId(scope, id, { ...props, vpcId: vpc.valueAsString });
  }
}
