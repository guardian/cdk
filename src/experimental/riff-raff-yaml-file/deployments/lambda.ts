import path from "path";
import type { GuStack } from "../../../constructs/core";
import type { GuLambdaFunction } from "../../../constructs/lambda";
import type { RiffRaffDeployment } from "../types";

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
      contentDirectory: path.parse(fileName).name,
      parameters: {
        bucketSsmLookup: true,
        lookupByTags: true,
        fileName,
      },
      actions: ["uploadLambda"],
    },
  };
}

export function updateLambdaDeployment(
  lambda: GuLambdaFunction,
  { name: cfnDeployName }: RiffRaffDeployment
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
      contentDirectory: path.parse(fileName).name,
      parameters: {
        bucketSsmLookup: true,
        lookupByTags: true,
        fileName,
      },
      actions: ["updateLambda"],
      dependencies: [cfnDeployName],
    },
  };
}
