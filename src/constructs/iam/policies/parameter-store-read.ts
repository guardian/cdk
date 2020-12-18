import type { PolicyProps } from "@aws-cdk/aws-iam";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { Try } from "../../../utils/try";
import type { GuStack } from "../../core";
import type { GuPolicyProps } from "./base-policy";
import { GuPolicy } from "./base-policy";

export class GuParameterStoreReadPolicy extends GuPolicy {
  private static getDefaultProps(scope: GuStack): PolicyProps {
    const app: string = new Try<string>(() => scope.app).getOrElse("*");

    return {
      policyName: "parameter-store-read-policy",
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["ssm:GetParametersByPath"],
          resources: [`arn:aws:ssm:${scope.region}:${scope.account}:parameter/${scope.stage}/${scope.stack}/${app}`],
        }),
      ],
    };
  }

  constructor(scope: GuStack, id: string = "ParameterStoreRead", props?: GuPolicyProps) {
    super(scope, id, { ...GuParameterStoreReadPolicy.getDefaultProps(scope), ...props });
  }
}
