import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import type { GuStack } from "../../core";
import { AppIdentity } from "../../core/identity";
import { GuPolicy } from "./base-policy";

export class GuParameterStoreReadPolicy extends GuPolicy {
  // eslint-disable-next-line custom-rules/valid-constructors -- TODO be better
  constructor(scope: GuStack, props: AppIdentity) {
    super(scope, AppIdentity.suffixText(props, "ParameterStoreRead"), {
      policyName: "parameter-store-read-policy",
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["ssm:GetParametersByPath"],
          resources: [
            `arn:aws:ssm:${scope.region}:${scope.account}:parameter/${scope.stage}/${scope.stack}/${props.app}`,
          ],
        }),
      ],
    });

    AppIdentity.taggedConstruct(props, this);
  }
}
