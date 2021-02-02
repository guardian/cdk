import { version } from "../../package.json";

export const LibraryInfo = {
  VERSION: version,
};

export const TrackingTag = {
  Key: "X-Gu-CDK-Version",
  Value: LibraryInfo.VERSION,
};
