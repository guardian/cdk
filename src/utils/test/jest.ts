import { Template } from "aws-cdk-lib/assertions";
import { TagKeys, TrackingTag } from "../../constants";
import type { AppIdentity, GuStack } from "../../constructs/core";
import { findResourceByTypeAndLogicalId } from "./synthed-stack";

interface Tag {
  Key: string;
  Value: unknown;
  PropagateAtLaunch?: boolean;
}

interface GuTagMatcherProps {
  appIdentity?: AppIdentity;
  additionalTags?: Tag[];
  propagateAtLaunch?: boolean;
  resourceProperties?: Record<string, unknown>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- custom Jest matcher
  namespace jest {
    interface Matchers<R> {
      toHaveResourceOfTypeAndLogicalId(resourceType: string, logicalId: string | RegExp): R;
      toHaveGuTaggedResource(resourceType: string, props?: GuTagMatcherProps): R;
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
    const matchResult = findResourceByTypeAndLogicalId(stack, resourceType, logicalId);

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

  /**
   * A Jest matcher to assert a resource with (at least) the standard Guardian tags (stack, stage, tracking tag).
   *
   * @param stack the stack to make an assertion on
   * @param resourceType the AWS resource type string, for example "AWS::AutoScaling::AutoScalingGroup"
   * @param props extra props, see [[GuTagMatcherProps]]
   */
  toHaveGuTaggedResource(stack: GuStack, resourceType: string, props?: GuTagMatcherProps) {
    const coreTags = [
      {
        Key: "Stack",
        Value: stack.stack,
      },
      {
        Key: "Stage",
        Value: stack.stage,
      },
      TrackingTag,
      {
        Key: TagKeys.REPOSITORY_NAME,
        Value: "guardian/cdk",
      },
    ];

    const tagMap = new Map<string, Tag>();
    coreTags.forEach((tag) => tagMap.set(tag.Key, tag));

    if (props?.appIdentity) {
      tagMap.set("App", { Key: "App", Value: props.appIdentity.app });
    }

    if (props?.additionalTags) {
      props.additionalTags.forEach((tag) => tagMap.set(tag.Key, tag));
    }

    // set `PropagateAtLaunch` if the prop is defined
    if (props?.propagateAtLaunch !== undefined) {
      tagMap.forEach((tag) => {
        tagMap.set(tag.Key, { ...tag, PropagateAtLaunch: props.propagateAtLaunch });
      });
    }

    const template = Template.fromStack(stack);

    const result = template.findResources(resourceType, {
      ...props?.resourceProperties,
      Tags: sortTagsByKey(Array.from(tagMap.values())),
    });

    const resourceFound = Object.keys(result).length > 0;

    return resourceFound
      ? { pass: true, message: () => "" }
      : { pass: false, message: () => `No ${resourceType} resource found with standard Guardian tags` };
  },
});

function sortTagsByKey(tags: Tag[]): Tag[] {
  return [...tags].sort((first, second) => {
    if (first.Key.toLowerCase() < second.Key.toLowerCase()) {
      return -1;
    }
    if (first.Key.toLowerCase() > second.Key.toLowerCase()) {
      return 1;
    }
    return 0;
  });
}
