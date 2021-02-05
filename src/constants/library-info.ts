import readPkgUp from "read-pkg-up";

const version = readPkgUp.sync({ cwd: __dirname })?.packageJson.version ?? "unknown";

export const LibraryInfo = {
  VERSION: version,
};

export const TrackingTag = {
  Key: "X-Gu-CDK-Version",
  Value: LibraryInfo.VERSION,
};
