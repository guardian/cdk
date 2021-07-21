import type { CredentialProviderChain } from "aws-sdk";
import AWS from "aws-sdk";
import { SSM_PARAMETER_PATHS } from "../../constants/ssm-parameter-paths";
import type { CliCommandResponse } from "../../types/command";

export const accountReadinessCommand = async ({
  credentialProvider,
  region,
}: {
  credentialProvider: CredentialProviderChain;
  region: string;
}): CliCommandResponse => {
  const ssm = new AWS.SSM({
    credentialProvider,
    region,
  });

  const ssmParams = Object.values(SSM_PARAMETER_PATHS);
  const paths: string[] = ssmParams.map((param) => param.path);

  const awsResponse = await ssm.getParameters({ Names: paths }).promise();

  const notFoundParameters = awsResponse.InvalidParameters ?? [];

  const notFoundInDetail = ssmParams.filter((_) => notFoundParameters.includes(_.path));
  const foundInDetail = ssmParams.filter((_) => !notFoundParameters.includes(_.path));
  return Promise.resolve({ found: foundInDetail, notFound: notFoundInDetail });
};
