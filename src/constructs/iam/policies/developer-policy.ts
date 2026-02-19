import { Effect, ManagedPolicy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { ManagedPolicyProps } from "aws-cdk-lib/aws-iam";
import type { GuStack } from "../../core";
import type { GuAllowPolicyProps, GuDenyPolicyProps } from "./base-policy";

export type GuDeveloperPolicyProps = Omit<ManagedPolicyProps, "statements"> & {
  allow: GuAllowPolicyProps[];
  deny?: GuDenyPolicyProps[];
  permission: string;
  description?: string;
};

export class GuDeveloperPolicy extends ManagedPolicy {
  constructor(scope: GuStack, id: string, props: GuDeveloperPolicyProps) {
    super(scope, id, { path: `/developer-policy/${props.permission}/`, ...props });
    for (const allowed of props.allow) {
      this.addStatements(
        new PolicyStatement({
          effect: Effect.ALLOW,
          resources: allowed.resources,
          actions: allowed.actions,
        }),
      );
    }
    if (props.deny) {
      for (const denied of props.deny) {
        this.addStatements(
          new PolicyStatement({
            effect: Effect.DENY,
            resources: denied.resources,
            actions: denied.actions,
          }),
        );
      }
    }
  }
}
