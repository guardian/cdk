import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { PolicyProps } from "aws-cdk-lib/aws-iam";
import type { GuStack } from "../../core";

export type GuPolicyProps = PolicyProps;

export type GuNoStatementsPolicyProps = Omit<GuPolicyProps, "statements">;

export class GuPolicy extends Policy {
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
