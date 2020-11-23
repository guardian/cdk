import type { ISubnet, IVpc, VpcAttributes } from "@aws-cdk/aws-ec2";
import { Subnet, Vpc } from "@aws-cdk/aws-ec2";
import type { GuStack } from "../core";

export class GuVpc {
  static subnets(scope: GuStack, subnets: string[]): ISubnet[] {
    return subnets.map((subnetId) => Subnet.fromSubnetId(scope, `subnet-${subnetId}`, subnetId));
  }

  static fromId(scope: GuStack, id: string, vpcId: string, props?: Partial<VpcAttributes>): IVpc {
    return Vpc.fromVpcAttributes(scope, id, {
      vpcId: vpcId,
      availabilityZones: scope.availabilityZones,
      ...props,
    });
  }
}
