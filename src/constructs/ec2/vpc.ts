import { Fn } from "aws-cdk-lib";
import { Subnet, Vpc } from "aws-cdk-lib/aws-ec2";
import type { ISubnet, IVpc, VpcAttributes } from "aws-cdk-lib/aws-ec2";
import { NAMED_SSM_PARAMETER_PATHS } from "../../constants";
import { GuSubnetListParameter, GuVpcParameter } from "../core";
import type { GuStack } from "../core";

interface VpcFromIdProps extends Omit<VpcAttributes, "availabilityZones"> {
  availabilityZones?: string[];
}

type VpcFromIdParameterProps = Omit<VpcFromIdProps, "vpcId">;

// TODO convert to boolean
export enum SubnetType {
  PUBLIC = "Public",
  PRIVATE = "Private",
}

// TODO: Migrate this to use `AppIdentity`
export interface GuSubnetProps {
  type?: SubnetType;
  app?: string;
}

/*
 * Some stacks maybe have multiple patterns (such as `GuEc2App`), therefore creating multiple VPC and subnet resources.
 * This function ensures that, where desired, we can have unique IDs for each VPC and subnet declaration
 */
export const maybeApp = (props?: { app?: string }): string => props?.app ?? "";

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
    // return subnets.map((subnetId) =>
    //   Subnet.fromSubnetAttributes(scope, `subnet-${subnetId}`, { subnetId, routeTableId: " " }),
    // );
    const subnetIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      subnetIds.push(Fn.select(i, subnets));
    }
    return subnetIds.map((subnetId) => Subnet.fromSubnetId(scope, `subnet-${subnetId}`, subnetId));
  }

  static subnetsFromParameter(scope: GuStack, props?: GuSubnetProps): ISubnet[] {
    const type = props?.type ?? SubnetType.PRIVATE;
    const parameterDefault =
      type === SubnetType.PRIVATE
        ? NAMED_SSM_PARAMETER_PATHS.PrimaryVpcPrivateSubnets
        : NAMED_SSM_PARAMETER_PATHS.PrimaryVpcPublicSubnets;

    const subnets = new GuSubnetListParameter(scope, `${maybeApp(props)}${type}Subnets`, {
      description: `A list of ${type.toLowerCase()} subnets`,
      default: parameterDefault.path,
      fromSSM: true,
    });

    return GuVpc.subnets(scope, subnets.valueAsList);
  }

  static subnetsFromParameterFixedNumber(scope: GuStack, props?: GuSubnetProps, numSubnets: number = 3): ISubnet[] {
    const type = props?.type ?? SubnetType.PRIVATE;
    const parameterDefault =
      type === SubnetType.PRIVATE
        ? NAMED_SSM_PARAMETER_PATHS.PrimaryVpcPrivateSubnets
        : NAMED_SSM_PARAMETER_PATHS.PrimaryVpcPublicSubnets;

    const subnets = new GuSubnetListParameter(scope, `${maybeApp(props)}${type}Subnets`, {
      description: `A list of ${type.toLowerCase()} subnets`,
      default: parameterDefault.path,
      fromSSM: true,
    });

    const subnetIds: string[] = [];
    for (let i = 0; i < numSubnets; i++) {
      subnetIds.push(Fn.select(i, subnets.valueAsList));
    }
    return subnetIds.map((subnetId) => Subnet.fromSubnetId(scope, `subnet-${subnetId}`, subnetId));
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
