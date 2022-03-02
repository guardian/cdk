import chalk from "chalk";
import type { AwsAccountReadiness, CliCommandResponse } from "../../../types/cli";
import { report as reportSSM } from "./ssm";

export interface Report {
  name: string;
  isPass: boolean;
  msg?: string;
  errors: Map<string, string>;
  parametersFound: number;
  parametersMissing: number;
}

export const accountReadinessCommand = async (props: AwsAccountReadiness): CliCommandResponse => {
  const report = await reportSSM(props);

  console.log(chalk.bold(report.name + ":") + " " + (report.isPass ? "✅ Pass" : "❌ Fail"));

  if (report.parametersFound == 0) {
    console.log(`It looks like this account has not been set up for @guardian/cdk yet. Run:

    @npx @guardian/cdk bootstrap

to bootstrap the account.`);

    return 1;
  }

  if (!report.isPass) {
    report.msg && console.log(report.msg + "\n");
    report.errors.forEach((errMsg, name) => console.log(`${chalk.red(name)}: ${errMsg}`));
    console.log();
  }

  return report.isPass ? 0 : 1;
};
