import { LibraryInfo } from "./library-info";
import { MetadataKeys } from "./metadata-keys";

export const TrackingTag = {
  Key: MetadataKeys.VERSION,
  // Static value when NODE_ENV=test (set explicitly in the generated test scripts) so snapshots don't change on every version bump
  Value: process.env.NODE_ENV === "test" ? "TEST" : LibraryInfo.VERSION,
};
