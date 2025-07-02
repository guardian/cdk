import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { CloudFormationStackArtifact } from "aws-cdk-lib/cx-api";
import type { GuStack } from "../../constructs/core";

/**
 * `Aspects` appear to run only at synth time.
 * This means we must synth the stack to see the results of the `Aspect`.
 *
 * @see https://github.com/aws/aws-cdk/issues/29047
 *
 * @param stack the stack to synthesise
 */
export function getTemplateAfterAspectInvocation(stack: GuStack): Template {
  const app = App.of(stack);

  if (!app) {
    throw new Error(`Unable to locate the enclosing App from GuStack ${stack.node.id}`);
  }

  const { artifacts } = app.synth();
  const cfnStacks = artifacts.filter((_): _ is CloudFormationStackArtifact => _ instanceof CloudFormationStackArtifact);
  const cfnStack = cfnStacks.find((artifact) => artifact.id === stack.node.id);

  if (!cfnStack) {
    throw new Error("Unable to locate a CloudFormationStackArtifact");
  }

  return Template.fromJSON(cfnStack.template as Record<string, unknown>);
}
