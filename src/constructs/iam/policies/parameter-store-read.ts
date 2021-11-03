import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { GuAppAwareConstruct } from "../../../utils/mixin/app-aware-construct";
import type { GuStack } from "../../core";
import type { AppIdentity } from "../../core/identity";
import { GuPolicy } from "./base-policy";

export class GuParameterStoreReadPolicyStatement extends PolicyStatement {
  constructor(scope: GuStack, props: AppIdentity) {
    super({
      effect: Effect.ALLOW,
      actions: ["ssm:GetParametersByPath"],
      resources: [`arn:aws:ssm:${scope.region}:${scope.account}:parameter/${scope.stage}/${scope.stack}/${props.app}`],
    });
  }
}

export class GuParameterStoreReadPolicy extends GuAppAwareConstruct(GuPolicy) {
  constructor(scope: GuStack, props: AppIdentity) {
    super(scope, "ParameterStoreRead", {
      policyName: "parameter-store-read-policy",
      statements: [new GuParameterStoreReadPolicyStatement(scope, props)],
      ...props,
    });
  }
}
