import { LibraryInfo } from "./library-info";
import { MetadataKeys } from "./metadata-keys";

const isTestEnvironment = process.env.NODE_ENV === "test";

export const TrackingTag = {
  Key: MetadataKeys.VERSION,
  Value: isTestEnvironment ? "TEST" : LibraryInfo.VERSION,
};
