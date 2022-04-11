import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { GuStack } from "../../core";
import { GuPolicy } from "./base-policy";
import type { GuNoStatementsPolicyProps } from "./base-policy";

export interface GuAssumeRolePolicyProps extends GuNoStatementsPolicyProps {
  resources: string[];
}

export class GuAssumeRolePolicy extends GuPolicy {
  constructor(scope: GuStack, id: string, props: GuAssumeRolePolicyProps) {
    super(scope, id, {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["sts:AssumeRole"],
          resources: props.resources,
        }),
      ],
      ...props,
    });
  }
}
