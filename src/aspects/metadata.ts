import type { IAspect, Stack } from "aws-cdk-lib";
import type { IConstruct } from "constructs";
import { MetadataKeys, TrackingTag } from "../constants";

export class Metadata implements IAspect {
  readonly stack: Stack;

  // eslint-disable-next-line custom-rules/valid-constructors -- doesn't apply here
  public constructor(s: Stack) {
    this.stack = s;
    this.stack.templateOptions.metadata = {
      [MetadataKeys.CONSTRUCTS_KEY]: [],

      /*
      `TrackingTag.Value` is a proxy to `LibraryInfo.VERSION`.
      Intentionally using `TrackingTag.Value` so that the published mock can be used.
       */
      [MetadataKeys.VERSION]: TrackingTag.Value,
    };
  }

  public visit(node: IConstruct): void {
    const metadata = this.stack.templateOptions.metadata;
    const name = node.constructor.name;

    // We assume any construct named Gu* is part of our public API.
    if (metadata && name.startsWith("Gu")) {
      (metadata[MetadataKeys.CONSTRUCTS_KEY] as string[]).push(name);
    }
  }
}
