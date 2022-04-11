import type { AppIdentity, GuStack } from "../constructs/core";

export interface GuDistributable {
  /**
   * The filename for an executable package within the bucket [[`GuDistributionBucketParameter`]].
   * We'll look for `fileName` on the path "bucket/stack/stage/app/<fileName>".
   */
  fileName: string;
}

export const GuDistributable = {
  getObjectKey({ stack, stage }: GuStack, { app }: AppIdentity, { fileName }: GuDistributable): string {
    return [stack, stage, app, fileName].join("/");
  },
};

export interface GuDistributableForEc2 extends GuDistributable {
  /**
   * The command to run `fileName`.
   * For example `dpkg -i application.deb` or `service foo start`.
   */
  executionStatement: string;
}
