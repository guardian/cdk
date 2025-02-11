import { Construct } from "constructs";
import { AppIdentity } from "../../constructs/core/identity";
import type { AnyConstructor } from "./types";

export function GuAppAwareConstruct<TBase extends AnyConstructor>(BaseClass: TBase) {
  class Mixin extends BaseClass {
    /**
     * The ID of the construct with the App suffix.
     * This should be used in place of `id` when trying to reference the construct.
     */
    readonly idWithApp: string;

    // eslint-disable-next-line custom-rules/valid-constructors, @typescript-eslint/no-explicit-any -- mixin
    protected constructor(...args: any[]) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- mixin
      const [scope, id, props, ...rest] = args;

      if (!AppIdentity.isAppIdentity(props)) {
        throw new Error("Cannot use the GuAppAwareConstruct mixin without an AppIdentity");
      }

      const app: string = props.app;
      const idWithApp = AppIdentity.suffixText({ app }, id as string);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- mixin
      const newArgs = [scope, idWithApp, props, ...rest];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- mixin
      super(...newArgs);

      this.idWithApp = idWithApp;

      /*
        Add the `App` tag to the construct.
        Although not every resource can be tagged, it's still safe to make the call.
        If AWS support tags on a new resource one day, our test suite will fail and we can celebrate!
        See https://docs.aws.amazon.com/ARG/latest/userguide/supported-resources.html
         */
      if (Construct.isConstruct(this)) {
        AppIdentity.taggedConstruct({ app }, this);
      }
    }
  }
  return Mixin;
}
