import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { GuApp } from "../../core";
import { GuPolicy } from "./base-policy";

/**
 * This is helpful for reading all private configuration for a given app. For example, the
 * [simple-configuration](https://github.com/guardian/simple-configuration) library requires these permissions.
 */
export class ReadParametersByPath extends PolicyStatement {
  constructor(scope: GuApp) {
    const { stack, stage, app } = scope;
    const { account, region } = scope.parent;
    super({
      effect: Effect.ALLOW,
      actions: ["ssm:GetParametersByPath"],
      resources: [`arn:aws:ssm:${region}:${account}:parameter/${stage}/${stack}/${app}`],
    });
  }
}

/**
 * This is helpful for accessing specific pieces of private configuration. For example, the
 * [play-secret-rotation](https://github.com/guardian/play-secret-rotation) library requires `ssm:GetParameters`
 * permissions.
 */
export class ReadParametersByName extends PolicyStatement {
  constructor(scope: GuApp) {
    const { stack, stage, app } = scope;
    const { account, region } = scope.parent;
    super({
      effect: Effect.ALLOW,
      actions: ["ssm:GetParameters", "ssm:GetParameter"],
      resources: [`arn:aws:ssm:${region}:${account}:parameter/${stage}/${stack}/${app}/*`],
    });
  }
}
/**
 * Grants read-only permissions for Parameter Store. These permissions are typically used for accessing private
 * configuration. See [[`ReadParametersByPath`]] and [[`ReadParametersByName`]] for more details.
 */
export class GuParameterStoreReadPolicy extends GuPolicy {
  constructor(scope: GuApp) {
    super(scope, "ParameterStoreRead", {
      policyName: "parameter-store-read-policy",
      statements: [new ReadParametersByPath(scope), new ReadParametersByName(scope)],
    });
  }
}
