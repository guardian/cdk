import { SSM_PARAMETER_PATHS } from "../../../constants/ssm-parameter-paths";
import type { AwsAccountReadiness, CliCommandResponse } from "../../../types/cli";
import { accountBootstrapCfn, createBootstrapStack } from "./account-bootstrap-stack";
import { ssmParamReadiness } from "./ssm";
import { vpcReadiness } from "./vpc";

export const accountReadinessCommand = async (props: AwsAccountReadiness): CliCommandResponse => {
  if (props.fix) {
    const params = Object.entries(SSM_PARAMETER_PATHS).map((kv) => kv[1]);
    const tpl = await accountBootstrapCfn(params);
    const stackName = await createBootstrapStack(props, tpl);
    consoleLogWrap(`Create is IN PROGRESS for '${stackName}'.`);
    consoleLogWrap("Go to the AWS Cloudformation Console to confirm that the stack creation completed successfully.");

    return Promise.resolve(0);
  }

  // if no params - suggest bootstrap
  // if only some, list the missing ones only
  // if vpc issues, warn but don't error

  // Got a new AWS account readiness command? Add it to this list and ✨
  const commandResponses: number[] = await Promise.all([ssmParamReadiness(props), vpcReadiness(props)]);

  const totalFailedCommands = commandResponses.filter((_) => _ !== 0);
  const allCommandsSuccessful = totalFailedCommands.length === 0;

  return allCommandsSuccessful ? 0 : 1;
};

// Thanks https://stackoverflow.com/a/51506718.
const wrap = (lineWidth: number, s: string) =>
  s.replace(new RegExp(`(?![^\\n]{1,${lineWidth}}$)([^\\n]{1,${lineWidth}})\\s`, "g"), "$1\n");
const wrap72 = wrap.bind(null, 72);
const consoleLogWrap = (s: string): void => {
  console.log(wrap72(s));
};
