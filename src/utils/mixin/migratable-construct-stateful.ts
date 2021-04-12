import { GuMigratableConstruct } from "./migratable-construct";
import type { AnyConstructor } from "./types";

export interface GuStatefulConstruct {
  /**
   * A flag to signal to `GuMigratingResource` that a construct is stateful and care should be taken when migrating to GuCDK.
   * If one accidentally replaces a stateful resource, downstream services such as DNS may be impacted.
   */
  isStatefulConstruct: true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types -- user defined type guard
export function isGuStatefulConstruct(construct: any): construct is GuStatefulConstruct {
  return "isStatefulConstruct" in construct;
}

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
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types -- mixin
export function GuStatefulMigratableConstruct<TBase extends AnyConstructor>(BaseClass: TBase) {
  return class extends GuMigratableConstruct(BaseClass) implements GuStatefulConstruct {
    get isStatefulConstruct(): true {
      return true;
    }
  };
}
