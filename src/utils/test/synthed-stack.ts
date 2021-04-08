import { SynthUtils } from "@aws-cdk/assert";
import type { Stage } from "../../constants";
import type { GuStack } from "../../constructs/core";

export interface Parameter {
  Type: string;
  Description: string;
  Default?: string | number;
  AllowedValues?: Array<string | number>;
}

export type ResourceProperty = Record<string, unknown>;
export type Resource = Record<string, { Type: string; Properties: ResourceProperty; UpdatePolicy?: unknown }>;

export interface SynthedStack {
  Parameters: Record<string, Parameter>;
  Mappings: Record<Stage, unknown>;
  Resources: Resource;
}

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
): Resource | undefined => {
  const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

  const match = Object.entries(json.Resources).find(([key, { Type }]) => {
    const logicalIdMatch = logicalIdPattern instanceof RegExp ? logicalIdPattern.test(key) : key === logicalIdPattern;
    const typeMatch = Type === resourceType;
    return logicalIdMatch && typeMatch;
  });

  if (match) {
    const [logicalId, resource] = match;
    return { [logicalId]: resource };
  }

  return undefined;
};
