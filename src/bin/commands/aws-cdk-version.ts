import { LibraryInfo } from "../../constants";
import type { CliCommandResponse } from "../../types/cli";

export const awsCdkVersionCommand = (): CliCommandResponse => {
  return Promise.resolve(LibraryInfo.AWS_CDK_VERSIONS);
};
