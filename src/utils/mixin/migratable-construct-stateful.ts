import type { GuStatefulConstruct } from "../../types";
import { GuMigratableConstruct } from "./migratable-construct";
import type { AnyConstructor } from "./types";

/**
 * A mixin to add the property `isStatefulConstruct` to a class and execute logic to conditionally override a construct's logicalId when synthesised.
 *
 * If one accidentally replaces a stateful resource, downstream services such as DNS may be impacted.
 *
 * Usage:
 * ```typescript
 * class MyClass extends GuStatefulMigratableConstruct(SomeAwsConstruct) { }
 * ```
 *
 * This results in any new instance of `MyClass` having an `isStatefulConstruct` accessor field:
 *
 * ```typescript
 * const resource = new MyClass();
 * console.log(resource.isStatefulConstruct) // true
 * ```
 *
 * Note, if you have `experimentalDecorators` enabled, you can use it as such:
 *
 * ```typescript
 * @GuStatefulMigratableConstruct
 * class MyClass extends SomeAwsConstruct { }
 * ```
 * As the name suggest, decorators are experimental.
 *
 * @param BaseClass the class to apply the mixin to
 * @constructor
 *
 * @see GuMigratableConstruct
 * @see GuMigratingResource
 * @see https://www.typescriptlang.org/docs/handbook/mixins.html
 * @see https://www.typescriptlang.org/docs/handbook/decorators.html
 *
 * @deprecated Please use the `overrideLogicalId` function on [[`GuStack`]]
 */
export function GuStatefulMigratableConstruct<TBase extends AnyConstructor>(BaseClass: TBase) {
  return class extends GuMigratableConstruct(BaseClass) implements GuStatefulConstruct {
    get isStatefulConstruct(): true {
      return true;
    }
  };
}
