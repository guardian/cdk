import AWS from "aws-sdk";
import chalk from "chalk";
import { LibraryInfo } from "../../../constants/library-info";
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

  console.group(chalk.bold("\nDefault VPC checks"));

  const defaultVpcs: string[] = vpcs
    .filter((vpc) => vpc.IsDefault)
    .map((vpc) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- a VPC always has an ID, the type in CDK is odd!
      return vpc.VpcId!;
    });

  const isDefaultVpcInUse: boolean = !!inUseVpcs.find((vpc) => vpc.IsDefault);

  const ssmParametersMatchingDefaultVpc = ssmParamsFromAccount.filter(
    ({ Value }) => Value && defaultVpcs.includes(Value)
  );

  const isDefaultVpcInSsmParameters = ssmParametersMatchingDefaultVpc.length > 0;

  if (isDefaultVpcInUse) {
    console.warn(
      `⚠️ The default VPC is in use. Whilst you're still able to use ${LibraryInfo.NAME}, it's recommended to use a custom VPC. See the docs for more information.`
    );
  }

  if (isDefaultVpcInSsmParameters) {
    console.warn(
      `⚠️ The default VPC is referenced within SSM Parameters. Whilst you're still able to use ${LibraryInfo.NAME}, it's recommended to use a custom VPC. See the docs for more information.`
    );

    console.table(ssmParametersMatchingDefaultVpc);
  }

  if (!isDefaultVpcInUse && !isDefaultVpcInSsmParameters) {
    console.log(
      `✅ The default VPC is not in use in ${region} and is not referenced by any SSM Parameters. No action needed.`
    );
  }

  console.groupEnd(); // Default VPC checks
  console.groupEnd(); // VPC Summary

  if (!usingDeprecatedSsmParameter && hasExpectedSsmParameters) {
    return Promise.resolve(0);
  } else {
    return Promise.resolve(1);
  }
};
