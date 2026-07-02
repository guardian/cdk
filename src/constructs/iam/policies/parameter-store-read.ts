import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { GuAppAwareConstruct } from "../../../utils/mixin/app-aware-construct";
import type { AppIdentity, GuStack } from "../../core";
import { GuPolicy } from "./base-policy";

/**
 * This is helpful for reading all private configuration for a given app. For example, the
 * [simple-configuration](https://github.com/guardian/simple-configuration) library requires these permissions.
 */
export class ReadParametersByPath extends PolicyStatement {
  constructor(scope: GuStack, props: AppIdentity) {
    super({
      effect: Effect.ALLOW,
      actions: ["ssm:GetParametersByPath"],
      resources: [`arn:aws:ssm:${scope.region}:${scope.account}:parameter/${scope.stage}/${scope.stack}/${props.app}`],
    });
  }
}

/**
 * This is helpful for accessing specific pieces of private configuration. For example, the
 * [play-secret-rotation](https://github.com/guardian/play-secret-rotation) library requires `ssm:GetParameters`
 * permissions.
 */
export class ReadParametersByName extends PolicyStatement {
  constructor(scope: GuStack, props: AppIdentity) {
    super({
      effect: Effect.ALLOW,
      actions: ["ssm:GetParameters", "ssm:GetParameter"],
      resources: [
        `arn:aws:ssm:${scope.region}:${scope.account}:parameter/${scope.stage}/${scope.stack}/${props.app}/*`,
      ],
    });
  }
}
/**
 * Grants read-only permissions for Parameter Store. These permissions are typically used for accessing private
 * configuration. See [[`ReadParametersByPath`]] and [[`ReadParametersByName`]] for more details.
 */
export class GuParameterStoreReadPolicy extends GuAppAwareConstruct(GuPolicy) {
  /**
   * A record of existing instances of this construct, per {@link GuStack}.
   * This allows us to implement singleton like behaviour.
   * @private
   */
  private static instances: WeakMap<GuStack, Record<string, GuParameterStoreReadPolicy>> = new WeakMap();

  private constructor(scope: GuStack, props: AppIdentity) {
    super(scope, "ParameterStoreRead", {
      policyName: "parameter-store-read-policy",
      statements: [new ReadParametersByPath(scope, props), new ReadParametersByName(scope, props)],
      ...props,
    });
  }

  public static getInstance(stack: GuStack, props: AppIdentity): GuParameterStoreReadPolicy {
    const maybeStackInstances = this.instances.get(stack);

    if (!maybeStackInstances) {
      const instance = new GuParameterStoreReadPolicy(stack, props);
      this.instances.set(stack, { [props.app]: instance });
      return instance;
    }

    const maybeInstance = maybeStackInstances[props.app];

    if (!maybeInstance) {
      const instance = new GuParameterStoreReadPolicy(stack, props);

      this.instances.set(stack, {
        ...maybeStackInstances,
        [props.app]: instance,
      });

      return instance;
    }

    return maybeInstance;
  }
}
