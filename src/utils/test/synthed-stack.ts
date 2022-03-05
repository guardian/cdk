import { Template } from "aws-cdk-lib/assertions";
import type { Resource, Template as TemplateType } from "aws-cdk-lib/assertions/lib/private/template";
import type { GuStack } from "../../constructs/core";

export type SynthedStack = TemplateType;

/**
 * A helper function to find a resource of a particular type and logicalId within a stack.
 * Useful for when the logicalId is auto-generated.
 * @param stack the stack to search in
 * @param resourceType the AWS resource type string, for example "AWS::AutoScaling::AutoScalingGroup"
 * @param logicalIdPattern a string or regex pattern to match against the resource's logicalId
 */
export const findResourceByTypeAndLogicalId = (
  stack: GuStack,
  resourceType: string,
  logicalIdPattern: string | RegExp
): Record<string, Resource> | undefined => {
  const template = Template.fromStack(stack);

  const typeMatches = template.findResources(resourceType) as Record<string, Resource>;

  const match = Object.entries(typeMatches).find(([key, resource]) => {
    const logicalIdMatch = logicalIdPattern instanceof RegExp ? logicalIdPattern.test(key) : key === logicalIdPattern;
    return logicalIdMatch && resource;
  });

  if (match) {
    const [logicalId, resource] = match;
    return { [logicalId]: resource };
  }

  return undefined;
};
