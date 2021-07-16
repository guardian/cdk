import { LibraryInfo } from "../../constants/library-info";

export const awsCdkVersionCommand = (verbose: boolean): Promise<string | Record<string, string>> => {
  return Promise.resolve(verbose ? LibraryInfo.AWS_CDK_VERSIONS : LibraryInfo.AWS_CDK_VERSION);
};
