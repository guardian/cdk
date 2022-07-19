import type { IAspect, Stack } from "aws-cdk-lib";
import type { IConstruct } from "constructs";
import { LibraryInfo, MetadataKeys } from "../constants";

export type GuConstruct = {
  readonly guConstructID: string;
};

const isGuConstruct = (construct: unknown): construct is GuConstruct => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- may be required
  return (construct as GuConstruct).guConstructID != undefined;
};

export class Metadata implements IAspect {
  readonly stack: Stack;

  // eslint-disable-next-line custom-rules/valid-constructors -- doesn't apply here
  public constructor(s: Stack) {
    this.stack = s;
    this.stack.templateOptions.metadata = { [MetadataKeys.CONSTRUCTS_KEY]: [] };
    this.stack.templateOptions.metadata[MetadataKeys.VERSION] = LibraryInfo.VERSION;
  }

  public visit(node: IConstruct): void {
    const metadata = this.stack.templateOptions.metadata;

    if (metadata && isGuConstruct(node)) {
      (metadata[MetadataKeys.CONSTRUCTS_KEY] as string[]).push(node.guConstructID);
    }
  }
}
