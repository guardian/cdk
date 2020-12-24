import type { CfnPolicy, PolicyProps } from "@aws-cdk/aws-iam";
import { Effect, Policy, PolicyStatement } from "@aws-cdk/aws-iam";
import type { GuStack } from "../../core";

export interface GuPolicyProps extends PolicyProps {
  overrideId?: boolean;
}

export abstract class GuPolicy extends Policy {
  protected constructor(scope: GuStack, id: string, props: GuPolicyProps) {
    super(scope, id, props);

    if (props.overrideId) {
      const child = this.node.defaultChild as CfnPolicy;
      child.overrideLogicalId(id);
    }
  }
}

export interface GuAllowPolicyProps extends GuPolicyProps {
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
