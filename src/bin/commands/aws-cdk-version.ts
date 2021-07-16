import { LibraryInfo } from "../../constants/library-info";

export const awsCdkVersionCommand = (verbose: boolean): void => {
  const response = verbose ? JSON.stringify(LibraryInfo.AWS_CDK_VERSIONS) : LibraryInfo.AWS_CDK_VERSION;
  console.log(response);
};
