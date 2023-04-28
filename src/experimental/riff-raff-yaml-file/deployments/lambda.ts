import type { GuStack } from "../../../constructs/core";
import type { GuLambdaFunction } from "../../../constructs/lambda";
import type { RiffRaffDeployment } from "../types";

const bucketProps = (lambda: GuLambdaFunction): {
  bucketSsmLookup?: boolean,
  bucketSsmKey?: string
} => lambda.bucketNamePath === undefined
  ? {
      bucketSsmLookup: true,
    }
  : {
      bucketSsmKey: lambda.bucketNamePath,
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
        ...bucketProps(lambda),
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
      contentDirectory: app,
      parameters: {
        ...bucketProps(lambda),
        lookupByTags: true,
        fileName,
      },
      actions: ["updateLambda"],
      dependencies: [cfnDeployName],
    },
  };
}
