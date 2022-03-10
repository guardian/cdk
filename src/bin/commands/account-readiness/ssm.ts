import AWS from "aws-sdk";
import chalk from "chalk";
import type { SsmParameterPath } from "../../../constants/ssm-parameter-paths";
import { SSM_PARAMETER_PATHS } from "../../../constants/ssm-parameter-paths";
import type { AwsConfig } from "../../../types/cli";
import { getSsmParametersForVpc, getVpcsInDetail } from "../../../utils/cli/vpc";
import type { Report } from ".";

interface SSMParameterReadinessOutput {
  missingParameters: SsmParameterPath[];
  foundParameters: SsmParameterPath[];
  defaultVPCReferences: SsmParameterPath[];
}

const ssmParamReadiness = async ({ credentialProvider, region }: AwsConfig): Promise<SSMParameterReadinessOutput> => {
  const ssmClient = new AWS.SSM({
    credentialProvider,
    region,
  });

  const ec2Client = new AWS.EC2({
    credentialProvider,
    region,
  });

  const ssmParams = Object.values(SSM_PARAMETER_PATHS).filter((param) => !param.optional);
  const paths: string[] = ssmParams.map((param) => param.path);

  const awsResponse = await ssmClient.getParameters({ Names: paths }).promise();

  const notFoundParameters = awsResponse.InvalidParameters ?? [];
  const notFoundInDetail = ssmParams.filter((_) => notFoundParameters.includes(_.path));
  const foundInDetail = ssmParams.filter((_) => !notFoundParameters.includes(_.path));

  const vpcs = await getVpcsInDetail(ec2Client);
  const ssmParamsFromAccount = await getSsmParametersForVpc(ssmClient);
  const defaultVpcs: string[] = vpcs
    .filter((vpc) => vpc.IsDefault)
    .map((vpc) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- a VPC always has an ID, the type in CDK is odd!
      return vpc.VpcId!;
    });

  const ssmParametersMatchingDefaultVpc = ssmParamsFromAccount.filter(
    ({ Value }) => Value && defaultVpcs.includes(Value)
  );

  const defaultVPCReferencePaths = ssmParametersMatchingDefaultVpc
    .map((param) => {
      return ssmParams.find((p) => p.path === param.Name);
    })
    .filter((p): p is SsmParameterPath => p !== undefined);

  return {
    foundParameters: foundInDetail,
    missingParameters: notFoundInDetail,
    defaultVPCReferences: defaultVPCReferencePaths,
  };
};

export const report = async (props: AwsConfig): Promise<Report> => {
  const output = await ssmParamReadiness(props);
  const isPass = output.missingParameters.length === 0 && output.defaultVPCReferences.length === 0;

  const errs = new Map<string, string>();
  const parametersMsg =
    "CDK uses predefined SSM parameters within patterns and constructs. For example, the EC2 APP pattern uses a parameter to determine which Kinesis stream to forward logs to. Your CDK app may fail at runtime if these parameters do not exist.";

  const missingParamsMsg = "Required parameters are missing";
  const missingParams = output.missingParameters.map((p) => `  ${chalk.yellowBright(p.path)}: ${p.description}`);

  if (output.missingParameters.length > 0) {
    errs.set(missingParamsMsg, `\n${missingParams.join("\n")}`);
  }

  if (output.defaultVPCReferences.length > 0) {
    errs.set(
      "Default VPC referenced in VPC parameters",
      `you should use a custom VPC instead. Default VPC is referenced in paths: ${output.defaultVPCReferences.join(
        ", "
      )}.`
    );
  }

  return {
    name: "SSM Parameter Readiness",
    isPass: isPass,
    msg: parametersMsg,
    errors: errs,
    parametersFound: output.foundParameters.length,
    parametersMissing: output.missingParameters.length,
  };
};

export const isPass = (output: SSMParameterReadinessOutput): boolean => {
  return output.missingParameters.length === 0;
};
