import AWS from "aws-sdk";
import chalk from "chalk";
import type { AwsAccountReadiness } from "../../../types/cli";
import { doesDefaultVpcSsmParameterExist, getSsmParametersForVpc, getVpcsInDetail } from "../../../utils/cli/vpc";

const UNKNOWN = "unknown";

export const vpcReadiness = async ({ credentialProvider, region }: AwsAccountReadiness): Promise<number> => {
  const ec2Client = new AWS.EC2({
    credentialProvider,
    region,
  });
  const ssmClient = new AWS.SSM({
    credentialProvider,
    region,
  });

  const vpcs = await getVpcsInDetail(ec2Client);
  const inUseVpcs = vpcs.filter((vpc) => vpc.isUsed);
  const ssmParamsFromAccount = await getSsmParametersForVpc(ssmClient);
  const usingDeprecatedSsmParameter = doesDefaultVpcSsmParameterExist(ssmParamsFromAccount);

  console.group(chalk.bold("\nVPC Summary"));

  if (usingDeprecatedSsmParameter) {
    console.log(
      `❌ SSM parameters with path '/account/vpc/default/*' found. Please rename to '/account/vpc/primary/*'`
    );
  }

  const totalSsmParametersExpected = inUseVpcs.length * 3;
  const hasExpectedSsmParameters = ssmParamsFromAccount.length === totalSsmParametersExpected;

  if (!hasExpectedSsmParameters) {
    console.log(
      `❌ Expected to find ${chalk.bold(
        totalSsmParametersExpected
      )} SSM Parameters (3 per in use VPC) but found ${chalk.bold(ssmParamsFromAccount.length)}`
    );
  }

  const vpcsForLogging = vpcs.map((vpc) => ({
    VpcId: vpc.VpcId ?? UNKNOWN,
    Region: region,
    IsAwsDefaultVpc: vpc.IsDefault,
    InUse: vpc.isUsed,
    CidrBlock: vpc.CidrBlock,
  }));
  console.table(vpcsForLogging);

  console.groupEnd();

  if (!usingDeprecatedSsmParameter && hasExpectedSsmParameters) {
    return Promise.resolve(0);
  } else {
    return Promise.resolve(1);
  }
};
