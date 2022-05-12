import { Construct } from "constructs";
import type { GuMigratingResource } from "../../constructs/core";
import { GuStack } from "../../constructs/core";
import type { AnyConstructor } from "./types";

export function WithStaticLogicalId<TBase extends AnyConstructor>(BaseClass: TBase) {
  return class extends BaseClass {
    // eslint-disable-next-line custom-rules/valid-constructors, @typescript-eslint/no-explicit-any -- mixin
    constructor(...args: any[]) {
      // `super` is the parent AWS constructor here
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- mixin
      super(...args);

      // Constrained mixins could be used here but couldn't get it to work
      // See https://www.typescriptlang.org/docs/handbook/mixins.html#constrained-mixins
      if (Construct.isConstruct(this)) {
        // the parent AWS constructor presents a common signature of `scope`, `id`, `props`
        if (args.length === 3) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- mixin
          const [, , maybeProps] = args;

          // `props` can be undefined
          const maybeExistingLogicalId = maybeProps ? (maybeProps as GuMigratingResource).existingLogicalId : undefined;

          if (maybeExistingLogicalId) {
            const stack = GuStack.of(this) as GuStack;
            stack.overrideLogicalId(this, maybeExistingLogicalId.logicalId, maybeExistingLogicalId.reason);
          }
        }
      }
    }
  };
}
