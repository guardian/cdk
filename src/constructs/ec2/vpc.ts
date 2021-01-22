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
    return subnets.map((subnetId) => Subnet.fromSubnetId(scope, `subnet-${subnetId}`, subnetId));
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
