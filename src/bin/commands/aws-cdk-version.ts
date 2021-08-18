import { LibraryInfo } from "../../constants/library-info";
import type { CliCommandResponse } from "../../types/cli";

export const awsCdkVersionCommand = (): CliCommandResponse => {
  return Promise.resolve(LibraryInfo.AWS_CDK_VERSIONS);
};
