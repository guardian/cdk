import type { CredentialProviderChain } from "aws-sdk";
import AWS from "aws-sdk";
import chalk from "chalk";
import { LibraryInfo } from "../../constants/library-info";
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

  console.log(
    `AWS account has ${chalk.bold(`${foundInDetail.length}/${ssmParams.length}`)} SSM parameters in region ${region}`
  );

  if (foundInDetail.length > 0) {
    console.log("\nExisting required parameters:");

    foundInDetail.forEach(({ path, description }) => {
      console.log(` ✅ ${chalk.yellowBright(path)} ${chalk.dim(`(${description})`)}`);
    });
  }

  if (notFoundInDetail.length > 0) {
    console.log("\nMissing required parameters:");

    notFoundInDetail.forEach(({ path, description }) => {
      console.log(` ❌ ${chalk.yellowBright(path)} ${chalk.dim(`(${description})`)}`);
    });
  }

  if (notFoundInDetail.length === 0) {
    // no action needed
    return 0;
  } else {
    console.log(
      chalk.red(
        `\nAWS account requires the above ${notFoundInDetail.length} SSM parameters to work with @guardian/cdk v${LibraryInfo.VERSION}`
      )
    );

    return 1;
  }
};
