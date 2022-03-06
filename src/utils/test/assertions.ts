import { Template } from "aws-cdk-lib/assertions";
import type { Resource } from "aws-cdk-lib/assertions/lib/private/template";
import { TagKeys, TrackingTag } from "../../constants";
import type { AppIdentity, GuStack } from "../../constructs/core";

interface Tag {
  Key: string;
  Value: unknown;
  PropagateAtLaunch?: boolean;
}

interface GuTagMatcherProps {
  appIdentity?: AppIdentity;
  additionalTags?: Tag[];
  propagateAtLaunch?: boolean;
}

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

export class GuTemplate {
  private readonly template: Template;
  private readonly stack: GuStack;

  constructor(scope: GuStack) {
    this.stack = scope;
    this.template = Template.fromStack(scope);
  }

  findResourceByLogicalId(type: string, logicalId: string | RegExp): Record<string, Resource> | undefined {
    const resources = this.template.findResources(type) as Record<string, Resource>;

    const match = Object.entries(resources).find(([id, resource]) => {
      const idMatch = logicalId instanceof RegExp ? logicalId.test(id) : id === logicalId;
      return idMatch && resource;
    });

    if (match) {
      const [logicalId, resource] = match;
      return { [logicalId]: resource };
    }

    return undefined;
  }

  hasResourceWithLogicalId(type: string, logicalId: string | RegExp) {
    const result = this.findResourceByLogicalId(type, logicalId);

    if (!result) {
      throw new Error(`No resource found matching logicalId ${logicalId.toString()} and Type ${type}`);
    }
  }

  hasGuTaggedResource(type: string, props?: GuTagMatcherProps) {
    const { stack, stage } = this.stack;
    const { appIdentity, additionalTags, propagateAtLaunch } = props ?? {};

    const coreTags = [
      {
        Key: "Stack",
        Value: stack,
      },
      {
        Key: "Stage",
        Value: stage,
      },
      TrackingTag,
      {
        Key: TagKeys.REPOSITORY_NAME,
        Value: "guardian/cdk",
      },
    ];

    const tagMap = new Map<string, Tag>();
    coreTags.forEach((tag) => tagMap.set(tag.Key, tag));

    if (appIdentity) {
      tagMap.set("App", { Key: "App", Value: appIdentity.app });
    }

    if (additionalTags) {
      additionalTags.forEach((tag) => tagMap.set(tag.Key, tag));
    }

    // set `PropagateAtLaunch` if the prop is defined
    if (propagateAtLaunch !== undefined) {
      tagMap.forEach((tag) => {
        tagMap.set(tag.Key, { ...tag, PropagateAtLaunch: propagateAtLaunch });
      });
    }

    this.template.hasResourceProperties(type, { Tags: sortTagsByKey(Array.from(tagMap.values())) });
  }
}
