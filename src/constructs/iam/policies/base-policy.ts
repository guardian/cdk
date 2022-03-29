import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { PolicyProps } from "aws-cdk-lib/aws-iam";
import { GuMigratableConstruct } from "../../../utils/mixin";
import type { GuStack } from "../../core";
import type { GuMigratingResource } from "../../core/migrating";

export interface GuPolicyProps extends PolicyProps, GuMigratingResource {}

export type GuNoStatementsPolicyProps = Omit<GuPolicyProps, "statements">;

export class GuPolicy extends GuMigratableConstruct(Policy) {
  constructor(scope: GuStack, id: string, props: GuPolicyProps) {
    super(scope, id, props);
  }
}

export interface GuAllowPolicyProps extends GuNoStatementsPolicyProps {
  actions: string[];
  resources: string[];
}
export type GuDenyPolicyProps = GuAllowPolicyProps;

export class GuAllowPolicy extends GuPolicy {
  constructor(scope: GuStack, id: string, props: GuAllowPolicyProps) {
    super(scope, id, props);

    this.addStatements(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: props.resources,
        actions: props.actions,
      })
    );
  }
}

export class GuDenyPolicy extends GuPolicy {
  constructor(scope: GuStack, id: string, props: GuDenyPolicyProps) {
    super(scope, id, props);

    this.addStatements(
      new PolicyStatement({
        effect: Effect.DENY,
        resources: props.resources,
        actions: props.actions,
      })
    );
  }
}
