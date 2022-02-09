import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { GuAppAwareConstruct } from "../../../utils/mixin/app-aware-construct";
import type { GuStack } from "../../core";
import type { AppIdentity } from "../../core/identity";
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
  constructor(scope: GuStack, props: AppIdentity) {
    super(scope, "ParameterStoreRead", {
      policyName: "parameter-store-read-policy",
      statements: [new ReadParametersByPath(scope, props), new ReadParametersByName(scope, props)],
      ...props,
    });
  }
}
