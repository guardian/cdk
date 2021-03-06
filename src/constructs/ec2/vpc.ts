import type { ISubnet, IVpc, VpcAttributes } from "@aws-cdk/aws-ec2";
import { Subnet, Vpc } from "@aws-cdk/aws-ec2";
import type { GuStack } from "../core";
import { GuSubnetListParameter, GuVpcParameter } from "../core";

interface VpcFromIdProps extends Omit<VpcAttributes, "availabilityZones"> {
  availabilityZones?: string[];
}

type VpcFromIdParameterProps = Omit<VpcFromIdProps, "vpcId">;

export enum SubnetType {
  PUBLIC = "Public",
  PRIVATE = "Private",
}

export interface GuSubnetProps {
  type?: SubnetType;
}

export class GuVpc {
  static subnets(scope: GuStack, subnets: string[]): ISubnet[] {
    /**
     *  As of ~1.77.0 of the aws/cdk, this line
     * [ previosuly Subnet.fromSubnetId(scope, `subnet-${subnetId}`, subnetId)) ]
     * resulted in the following error
     * "Found an encoded list token string in a scalar string context. Use 'Fn.select(0, list)' (not 'list[0]') to extract elements from token lists."
     * See https://github.com/aws/aws-cdk/issues/11945 for more information
     *
     * As a hacky workaround, we have moved to using the fromSubnetAttributes method and hardcoded an empty value
     * for the routeTableId prop. This prevents the error and, when tested on existings stacks, results in no change to the CFN output
     *
     * TODO: Understand VPCs and Subnets better and develop a better solution to this problem
     */
    return subnets.map((subnetId) =>
      Subnet.fromSubnetAttributes(scope, `subnet-${subnetId}`, { subnetId, routeTableId: " " })
    );
  }

  static subnetsfromParameter(scope: GuStack, props?: GuSubnetProps): ISubnet[] {
    const type = props?.type ?? SubnetType.PRIVATE;

    const subnets = new GuSubnetListParameter(scope, `${type}Subnets`, {
      description: `A list of ${type.toLowerCase()} subnets`,
      default: `/account/vpc/primary/subnets/${type.toLowerCase()}`,
      fromSSM: true,
    });

    return GuVpc.subnets(scope, subnets.valueAsList);
  }

  static fromId(scope: GuStack, id: string, props: VpcFromIdProps): IVpc {
    return Vpc.fromVpcAttributes(scope, id, {
      availabilityZones: scope.availabilityZones,
      ...props,
    });
  }

  static fromIdParameter(scope: GuStack, id: string, props?: VpcFromIdParameterProps): IVpc {
    const vpc = new GuVpcParameter(scope, "VpcId", {
      description: "Virtual Private Cloud to run EC2 instances within",
      default: "/account/vpc/primary/id",
      fromSSM: true,
    });

    return GuVpc.fromId(scope, id, { ...props, vpcId: vpc.valueAsString });
  }
}
