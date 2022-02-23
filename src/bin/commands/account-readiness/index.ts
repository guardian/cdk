import chalk from "chalk";
import type { AwsAccountReadiness, CliCommandResponse } from "../../../types/cli";
import { report as reportSSM } from "./ssm";

export interface Report {
  name: string;
  isPass: boolean;
  msg?: string;
  errors: Map<string, string>;
}

export const accountReadinessCommand = async (props: AwsAccountReadiness): CliCommandResponse => {
  // Got a new AWS account readiness command? Add it to this list and ✨
  const reports = await Promise.all([reportSSM(props)]);
  const allPassed = reports.find((report) => !report.isPass);

  reports.forEach((report) => {
    console.log(chalk.bold(report.name + ":") + " " + (report.isPass ? "✅ Pass" : "❌ Fail"));

    if (!report.isPass) {
      report.msg && console.log(report.msg + "\n");
      report.errors.forEach((errMsg, name) => console.log(`${chalk.red(name)}: ${errMsg}`));
      console.log();
    }
  });

  return allPassed ? 0 : 1;
};
