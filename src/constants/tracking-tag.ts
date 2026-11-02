import { LibraryInfo } from "./library-info";
import { MetadataKeys } from "./metadata-keys";

// Jest sets NODE_ENV=test, keeping snapshots stable across library upgrades
const isTestEnv = process.env.NODE_ENV?.toLowerCase() === "test";

export const TrackingTag = {
  Key: MetadataKeys.VERSION,
  Value: isTestEnv ? "TEST" : LibraryInfo.VERSION,
};
