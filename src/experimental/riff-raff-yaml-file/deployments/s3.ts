import type { GuStack } from "../../../constructs/core";
import type { GuS3OriginBucket } from "../../../constructs/s3";
import type { RiffRaffDeployment } from "../types";

export function uploadStaticFilesDeployment(
  stages: string[],
  originBucket: GuS3OriginBucket,
  { name: cfnDeployName }: RiffRaffDeployment
): RiffRaffDeployment {
  const { app, _deploymentProps } = originBucket;
  const { withoutStageAwareness, baseParameterName, cacheControl, surrogateControl, mimeTypes } = _deploymentProps;
  const { stack, region } = originBucket.stack as GuStack;

  const cacheControlValue = Object.entries(cacheControl).map(([pattern, duration]) => {
    return {
      pattern,
      value: `public, max-age=${duration.toSeconds()}`,
    };
  });

  const surrogateControlValue = Object.entries(surrogateControl).map(([pattern, duration]) => {
    return {
      pattern,
      value: `public, max-age=${duration.toSeconds()}`,
    };
  });

  return {
    name: ["upload-static-files", region, stack, app].join("-"),
    props: {
      type: "aws-s3",
      actions: ["uploadStaticFiles"],
      dependencies: [cfnDeployName],
      stacks: new Set([stack]),
      regions: new Set([region]),
      app,
      contentDirectory: app,
      parameters: {
        bucketSsmKeyStageParam: stages.reduce(
          (acc, stage) => ({
            ...acc,
            [stage]: withoutStageAwareness ? baseParameterName : `/${stage}${baseParameterName}`,
          }),
          {}
        ),

        // Never create per object ACLs.
        // If the bucket content needs to be public, it’s better to control this via the bucket policy.
        publicReadAcl: false,

        cacheControl: cacheControlValue.length > 0 ? cacheControlValue : "private",

        // only add the `surrogateControl` property if there are some
        ...(surrogateControlValue.length > 0 && { surrogateControl: surrogateControlValue }),

        // only add the `mimeTypes` property if there are some
        ...(Object.keys(mimeTypes).length > 0 && { mimeTypes }),
      },
    },
  };
}
