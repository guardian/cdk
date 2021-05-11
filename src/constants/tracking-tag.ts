import readPkgUp from "read-pkg-up";
import { TagKeys } from "./tag-keys";

const version = readPkgUp.sync({ cwd: __dirname })?.packageJson.version ?? "unknown";

export const LibraryInfo = {
  VERSION: version,
};

export const TrackingTag = {
  Key: TagKeys.TRACKING_TAG,
  Value: LibraryInfo.VERSION,
};
