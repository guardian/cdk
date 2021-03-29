import { readPackageUpSync } from "read-pkg-up";

const version = readPackageUpSync({ cwd: __dirname })?.packageJson.version ?? "unknown";

export const LibraryInfo = {
  VERSION: version,
};

export const TrackingTag = {
  Key: "gu:cdk:version",
  Value: LibraryInfo.VERSION,
};
