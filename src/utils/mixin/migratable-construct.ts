import { Construct } from "constructs";
import { GuMigratingResource } from "../../constructs/core/migrating";
import { isGuMigratingStack } from "../../types/migrating";
import type { AnyConstructor } from "./types";

/**
 * A mixin to add the property `isStatefulConstruct` to a class and execute logic to conditionally override a construct's logicalId when synthesised.
 *
 * Overriding the logicalId makes a migration easier as the resulting CloudFormation template has a smaller difference from that of a running stack.
 *
 * For example, say you have a stack defined in YAML that creates a bucket:
 *
 * ```yaml
 * MyBucket:
 *   Type: AWS::S3::Bucket
 * ```
 *
 * By default, the CDK library will auto-generate the logicalId of resources. That is, by default a bucket would look like:
 *
 * ```yaml
 * MyBucketA0B1C2D:
 *   Type: AWS::S3::Bucket
 * ```
 *
 * Override the logicalId to keep it to `MyBucket`.
 *
 * Usage:
 * ```typescript
 * class MyClass extends GuMigratableConstruct(SomeAwsConstruct) { }
 *```
 *
 * Note, if you have `experimentalDecorators` enabled, you can use it as such:
 *
 * ```typescript
 * @GuMigratableConstruct
 * class MyClass extends SomeAwsConstruct {
 *
 * }
 * ```
 * As the name suggest, decorators are experimental.
 *
 * @param BaseClass the class to apply the mixin to
 * @constructor
 *
 * @see GuStatefulMigratableConstruct
 * @see GuMigratingResource
 * @see https://www.typescriptlang.org/docs/handbook/mixins.html
 * @see https://www.typescriptlang.org/docs/handbook/decorators.html
 */
export function GuMigratableConstruct<TBase extends AnyConstructor>(BaseClass: TBase) {
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
          const [scope, id, maybeProps] = args;

          // Ensure `args` are of the correct type
          if (isGuMigratingStack(scope) && typeof id === "string") {
            // `props` can be undefined
            const existingLogicalId = maybeProps ? (maybeProps as GuMigratingResource).existingLogicalId : undefined;

            GuMigratingResource.setLogicalId(
              this,
              {
                migratedFromCloudFormation: scope.migratedFromCloudFormation,
              },
              { existingLogicalId }
            );
          }
        }
      }
    }
  };
}
