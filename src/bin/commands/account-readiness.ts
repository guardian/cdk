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
    `AWS account has ${chalk.bold(`${foundInDetail.length}/${ssmParams.length}`)} params in region ${region}\n`
  );

  if (foundInDetail.length > 0) {
    console.log("Existing required parameters:");
    console.log(
      foundInDetail
        .map((param) => {
          const dimDescription = chalk.dim(`(${param.description})`);
          return ` ✅ ${chalk.yellowBright(param.path)} ${dimDescription}`;
        })
        .join("\n"),
      "\n"
    );
  }

  if (notFoundInDetail.length > 0) {
    console.log("Missing required parameters:");
    console.log(
      notFoundInDetail
        .map((param) => {
          const dimDescription = chalk.dim(`(${param.description})`);
          return ` ❌ ${chalk.yellowBright(param.path)} ${dimDescription}`;
        })
        .join("\n"),
      "\n"
    );
    return chalk.red(
      `AWS account requires the above ${notFoundInDetail.length} required parameters to work with @guardian/cdk v${LibraryInfo.VERSION}`
    );
  } else {
    return 0;
  }
};
