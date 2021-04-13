export const LibraryInfo = {
  VERSION: "TEST",
};

export const TrackingTag = {
  Key: "gu:cdk:version",
  Value: LibraryInfo.VERSION,
};

export const TrackingTagWithPropagate = {
  ...TrackingTag,
  PropagateAtLaunch: true,
};
