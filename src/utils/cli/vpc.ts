import type { DescribeSubnetsResult, DescribeVpcsResult, EC2, Subnet, Vpc } from "@aws-sdk/client-ec2";
import type { Parameter, SSM } from "@aws-sdk/client-ssm";
import { ALL_SSM_PARAMETER_PATHS, VPC_SSM_PARAMETER_PREFIX } from "../../constants";
import type { VpcInDetail } from "../../types/cli";
import { sum } from "../math";

export const primaryVpcSsmParameterPaths: string[] = ALL_SSM_PARAMETER_PATHS.map((_) => _.path).filter((_) =>
  _.startsWith(VPC_SSM_PARAMETER_PREFIX),
);

export const vpcSsmParameterPaths: RegExp[] = primaryVpcSsmParameterPaths.map((primaryPath) => {
  const reBody = primaryPath.replace("primary", "([A-z0-9.-_])+");
  return new RegExp(`^${reBody}$`);
});

const getSsmParametersWithVpcPrefix = async (ssmClient: SSM): Promise<Parameter[]> => {
  const params = await ssmClient.getParametersByPath({
    Path: VPC_SSM_PARAMETER_PREFIX,
    Recursive: true,
  });

  return params.Parameters ?? [];
};

export const getSsmParametersForVpc = async (ssmClient: SSM): Promise<Parameter[]> => {
  const paramsWithVpcPrefix = await getSsmParametersWithVpcPrefix(ssmClient);

  return paramsWithVpcPrefix.filter((param) => {
    const path = param.Name;
    if (!path) {
      return false;
    }

    return vpcSsmParameterPaths.filter((re) => re.exec(path)).length > 0;
  });
};

const getSubnetsForVpc = async (vpc: Vpc, ec2Client: EC2): Promise<Subnet[]> => {
  if (!vpc.VpcId) {
    return [];
  }
  const response: DescribeSubnetsResult = await ec2Client.describeSubnets({
    Filters: [{ Name: "vpc-id", Values: [vpc.VpcId] }],
  });
  return response.Subnets ?? [];
};

const getVpcs = async (ec2Client: EC2): Promise<Vpc[]> => {
  const vpcs: DescribeVpcsResult = await ec2Client.describeVpcs();
  return vpcs.Vpcs ?? [];
};

const totalUnusedAddressesInSubnet = (subnets: Subnet[]): number => {
  return sum(subnets.map((_) => _.AvailableIpAddressCount ?? 0));
};

const countFromCidr = (cidr: string): number => {
  const UNUSABLE_IPS_IN_CIDR_BLOCK = 5;

  const [, mask] = cidr.split("/");
  const maskAsNumber = Number(mask);

  if (isNaN(maskAsNumber)) {
    return 0;
  }

  const hostBits = 32 - maskAsNumber;
  return Math.pow(2, hostBits) - UNUSABLE_IPS_IN_CIDR_BLOCK;
};

const totalCapacityOfSubnet = (subnets: Subnet[]): number => {
  const counts = subnets
    .map((subnet) => subnet.CidrBlock)
    .map((cidrBlock) => (cidrBlock ? countFromCidr(cidrBlock) : 0));

  return sum(counts.filter((_) => !!_));
};

export const getVpcsInDetail = async (ec2Client: EC2): Promise<VpcInDetail[]> => {
  const vpcs = await getVpcs(ec2Client);

  return await Promise.all(
    vpcs.map(async (vpc) => {
      const subnets = await getSubnetsForVpc(vpc, ec2Client);

      const isUsed: boolean = totalCapacityOfSubnet(subnets) - totalUnusedAddressesInSubnet(subnets) !== 0;

      return {
        ...vpc,
        subnets,
        isUsed,
      };
    }),
  );
};
