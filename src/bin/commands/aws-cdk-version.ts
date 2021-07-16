import { LibraryInfo } from "../../constants/library-info";
import type { CliCommandResponse } from "../../types/command";

export const awsCdkVersionCommand = (verbose: boolean): CliCommandResponse => {
  return Promise.resolve(verbose ? LibraryInfo.AWS_CDK_VERSIONS : LibraryInfo.AWS_CDK_VERSION);
};
