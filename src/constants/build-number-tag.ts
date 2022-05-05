import { getBuildNumber } from "../utils/build-number";
import { TagKeys } from "./tag-keys";

export const BuildNumberTag = {
  Key: TagKeys.BUILD_NUMBER,
  Value: getBuildNumber(),
};
