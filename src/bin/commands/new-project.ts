import { execSync } from "child_process";
import type { CliCommandResponse } from "../../types/cli";

export const newProjectCommand = async (): CliCommandResponse => {
  execSync(`npx projen new --from @guardian/cdk-app-ts`);
  return Promise.resolve(0);
};
