import { SSM_PARAMETER_PATHS } from "../../../constants/ssm-parameter-paths";
import type { AwsAccountReadiness, CliCommandResponse } from "../../../types/cli";
import { accountBootstrapCfn, writeBootrapCfn } from "./account-bootstrap-stack";
import { ssmParamReadiness } from "./ssm";
import { vpcReadiness } from "./vpc";

export const accountReadinessCommand = async (props: AwsAccountReadiness): CliCommandResponse => {
  if (props.fix) {
    const params = Object.entries(SSM_PARAMETER_PATHS).map((kv) => kv[1]);
    const tpl = await accountBootstrapCfn(params);
    writeBootrapCfn(tpl);
    consoleLogWrap(`SUCCESS! cdk-bootstrap-INFRA.yaml template added to current directory!`);

    console.log();

    consoleLogWrap(
      "Use it to create 'cdk-bootstrap-INFRA' Cloudformation stack with everything you need to get started. You should also commit the template to an appropriate Git repository."
    );

    return Promise.resolve(0);
  }

  // Got a new AWS account readiness command? Add it to this list and ✨
  const commandResponses: number[] = await Promise.all([ssmParamReadiness(props), vpcReadiness(props)]);

  const totalFailedCommands = commandResponses.filter((_) => _ !== 0);
  const allCommandsSuccessful = totalFailedCommands.length === 0;

  return allCommandsSuccessful ? 0 : 1;
};

// Thanks https://stackoverflow.com/a/51506718.
const wrap = (w: number, s: string) => s.replace(new RegExp(`(?![^\\n]{1,${w}}$)([^\\n]{1,${w}})\\s`, "g"), "$1\n");
const wrap72 = wrap.bind(null, 72);
const consoleLogWrap = (s: string): void => {
  console.log(wrap72(s));
};
