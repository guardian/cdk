import type { ISubnet, IVpc, VpcAttributes } from "@aws-cdk/aws-ec2";
import { Subnet, Vpc } from "@aws-cdk/aws-ec2";
import type { GuStack } from "../core";
import { GuVpcParameter } from "../core";

interface VpcFromIdProps extends Omit<VpcAttributes, "availabilityZones"> {
  availabilityZones?: string[];
}

type VpcFromIdParameterProps = Omit<VpcFromIdProps, "vpcId">;

export class GuVpc {
  static subnets(scope: GuStack, subnets: string[]): ISubnet[] {
    return subnets.map((subnetId) => Subnet.fromSubnetId(scope, `subnet-${subnetId}`, subnetId));
  }

  static fromId(scope: GuStack, id: string, props: VpcFromIdProps): IVpc {
    return Vpc.fromVpcAttributes(scope, id, {
      availabilityZones: scope.availabilityZones,
      ...props,
    });
  }

  static fromIdParameter(scope: GuStack, id: string, props: VpcFromIdParameterProps): IVpc {
    const vpc = new GuVpcParameter(scope, "VpcId", {
      description: "Virtual Private Cloud to run EC2 instances within",
      default: "/account/services/default.vpc",
      fromSSM: true,
    });

    return GuVpc.fromId(scope, id, { ...props, vpcId: vpc.valueAsString });
  }
}
