import { SynthUtils } from "@aws-cdk/assert";
import type { GuStack } from "../../constructs/core";
import type { SynthedStack } from "./synthed-stack";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- custom Jest matcher
  namespace jest {
    interface Matchers<R> {
      toHaveResourceOfTypeAndLogicalId(resourceType: string, logicalId: string | RegExp): R;
    }
  }
}

expect.extend({
  /**
   * A helper function to assert a stack has a resource of a particular type and logicalId.
   * Useful for when the logicalId is auto-generated.
   * @param stack the stack to make an assertion on
   * @param resourceType the AWS resource type string, for example "AWS::AutoScaling::AutoScalingGroup"
   * @param logicalId a string or regex pattern to match against the resource's logicalId
   */
  toHaveResourceOfTypeAndLogicalId(stack: GuStack, resourceType: string, logicalId: string | RegExp) {
    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    const matchResult = Object.entries(json.Resources).find(([key, { Type }]) => {
      const logicalIdMatch = logicalId instanceof RegExp ? logicalId.test(key) : key === logicalId;
      const typeMatch = Type === resourceType;
      return logicalIdMatch && typeMatch;
    });

    return matchResult
      ? {
          pass: true,
          message: () => "",
        }
      : {
          pass: false,
          message: () => `No resource found matching logicalId ${logicalId.toString()} and Type ${resourceType}`,
        };
  },
});
