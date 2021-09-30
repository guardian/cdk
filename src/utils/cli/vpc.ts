import type AWS from "aws-sdk";
import type { DescribeSubnetsResult, DescribeVpcsResult, SubnetList, Vpc, VpcList } from "aws-sdk/clients/ec2";
import type { ParameterList } from "aws-sdk/clients/ssm";
import { SSM_PARAMETER_PATHS, VPC_SSM_PARAMETER_PREFIX } from "../../constants/ssm-parameter-paths";
import type { VpcInDetail } from "../../types/cli";
import { sum } from "../math";

export const primaryVpcSsmParameterPaths: string[] = Object.values(SSM_PARAMETER_PATHS)
  .map((_) => _.path)
  .filter((_) => _.startsWith(VPC_SSM_PARAMETER_PREFIX));

export const vpcSsmParameterPaths: RegExp[] = primaryVpcSsmParameterPaths.map((primaryPath) => {
  const reBody = primaryPath.replace("primary", "([A-z0-9.-_])+");
  return new RegExp(`^${reBody}$`);
});

const getSsmParametersWithVpcPrefix = async (ssmClient: AWS.SSM): Promise<ParameterList> => {
  const params = await ssmClient
    .getParametersByPath({
      Path: VPC_SSM_PARAMETER_PREFIX,
      Recursive: true,
    })
    .promise();
  return params.Parameters ?? [];
};

export const getSsmParametersForVpc = async (ssmClient: AWS.SSM): Promise<ParameterList> => {
  const paramsWithVpcPrefix = await getSsmParametersWithVpcPrefix(ssmClient);

  return paramsWithVpcPrefix.filter((param) => {
    const path = param.Name;
    if (!path) {
      return false;
    }

    return vpcSsmParameterPaths.filter((re) => re.exec(path)).length > 0;
  });
};

export const doesDefaultVpcSsmParameterExist = (parameters: ParameterList): boolean => {
  const vpcIdentifiers = parameters.map((_) => vpcIdentifierFromVpcSsmParameterPath(_.Name ?? ""));
  return vpcIdentifiers.includes("default");
};

export const vpcIdentifierFromVpcSsmParameterPath = (path: string): string => {
  const [, , identifier] = path.split("/");
  return identifier;
};

const getSubnetsForVpc = async (vpc: Vpc, ec2Client: AWS.EC2): Promise<SubnetList> => {
  if (!vpc.VpcId) {
    return [];
  }
  const response: DescribeSubnetsResult = await ec2Client
    .describeSubnets({ Filters: [{ Name: "vpc-id", Values: [vpc.VpcId] }] })
    .promise();
  return response.Subnets ?? [];
};

const getVpcs = async (ec2Client: AWS.EC2): Promise<VpcList> => {
  const vpcs: DescribeVpcsResult = await ec2Client.describeVpcs().promise();
  return vpcs.Vpcs ?? [];
};

const totalUnusedAddressesInSubnet = (subnets: SubnetList): number => {
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

const totalCapacityOfSubnet = (subnets: SubnetList): number => {
  const counts = subnets
    .map((subnet) => subnet.CidrBlock)
    .map((cidrBlock) => (cidrBlock ? countFromCidr(cidrBlock) : 0));

  return sum(counts.filter((_) => !!_));
};

export const getVpcsInDetail = async (ec2Client: AWS.EC2): Promise<VpcInDetail[]> => {
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
    })
  );
};
