import type { CredentialProviderChain } from "aws-sdk";
import AWS from "aws-sdk";
import { SSM_PARAMETER_PATHS } from "../../constants/ssm-parameter-paths";

export const accountReadinessCommand = async ({
  credentialProvider,
  region,
  verbose,
}: {
  credentialProvider: CredentialProviderChain;
  region: string;
  verbose: boolean;
}) => {
  const ssm = new AWS.SSM({
    credentialProvider,
    region,
  });

  const ssmParams = Object.values(SSM_PARAMETER_PATHS);
  const paths: string[] = ssmParams.map((param) => param.path);

  const awsResponse = await ssm.getParameters({ Names: paths }).promise();

  const foundParameters = awsResponse.Parameters ?? [];
  const notFoundParameters = awsResponse.InvalidParameters ?? [];

  if (!verbose) {
    const messagePrefix = notFoundParameters.length === 0 ? "OK" : "ACTION NEEDED";

    return Promise.resolve(
      `[${messagePrefix}] ${foundParameters.length}/${ssmParams.length} SSM parameters found. ${notFoundParameters.length}/${ssmParams.length} SSM parameters not found.`
    );
  } else {
    const notFoundInDetail = ssmParams.filter((_) => notFoundParameters.includes(_.path));
    const foundInDetail = ssmParams.filter((_) => !notFoundParameters.includes(_.path));
    return Promise.resolve({ found: foundInDetail, notFound: notFoundInDetail });
  }
};
