import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import type { GuStack } from "../../core";
import type { GuPolicyProps } from "./base-policy";
import { GuPolicy } from "./base-policy";

export interface GuAssumeRolePolicyProps extends Omit<GuPolicyProps, "statements"> {
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
