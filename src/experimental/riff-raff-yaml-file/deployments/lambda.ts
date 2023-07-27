import type { GuStack } from "../../../constructs/core";
import type { GuLambdaFunction } from "../../../constructs/lambda";
import type { RiffRaffDeployment } from "../types";

interface S3LocationProps {
  bucketSsmLookup?: boolean;
  bucketSsmKey?: string;
  prefixStackToKey?: boolean;
  prefixAppToKey?: boolean;
  prefixStageToKey?: boolean;
}

const locationProps = (lambda: GuLambdaFunction): S3LocationProps => {
  const bucketProp =
    lambda.bucketNamePath === undefined
      ? {
          bucketSsmLookup: true,
        }
      : {
          bucketSsmKey: lambda.bucketNamePath,
        };

  /**
   * If the lambda has a file prefix, we don't want to prefix the key with the stack, app or stage.
   * The default value for these properties is `true`, so we don't need to set them explicitly if
   * we *do* want to add the prefixes (and RiffRaff will complain if we add them).
   */
  const prefixProps = lambda.withoutFilePrefix
    ? {
        prefixStackToKey: false,
        prefixAppToKey: false,
        prefixStageToKey: false,
      }
    : {};

  return {
    ...bucketProp,
    ...prefixProps,
  };
};

export function uploadLambdaArtifact(lambda: GuLambdaFunction): RiffRaffDeployment {
  const { app, fileName } = lambda;
  const { stack, region } = lambda.stack as GuStack;

  return {
    name: ["lambda-upload", region, stack, app].join("-"),
    props: {
      type: "aws-lambda",
      stacks: new Set([stack]),
      regions: new Set([region]),
      app,
      contentDirectory: app,
      parameters: {
        ...locationProps(lambda),
        lookupByTags: true,
        fileName,
      },
      actions: ["uploadLambda"],
    },
  };
}

export function updateLambdaDeployment(
  lambda: GuLambdaFunction,
  { name: cfnDeployName }: RiffRaffDeployment,
): RiffRaffDeployment {
  const { app, fileName } = lambda;
  const { stack, region } = lambda.stack as GuStack;

  return {
    name: ["lambda-update", region, stack, app].join("-"),
    props: {
      type: "aws-lambda",
      stacks: new Set([stack]),
      regions: new Set([region]),
      app,
      contentDirectory: app,
      parameters: {
        ...locationProps(lambda),
        lookupByTags: true,
        fileName,
      },
      actions: ["updateLambda"],
      dependencies: [cfnDeployName],
    },
  };
}
