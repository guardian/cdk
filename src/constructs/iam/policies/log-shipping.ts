import type { GuStack } from "../../core";
import { GuLoggingStreamNameParameter } from "../../core/parameters/log-shipping";
import { GuAllowPolicy } from "./base-policy";

export class GuLogShippingPolicy extends GuAllowPolicy {
  // eslint-disable-next-line custom-rules/valid-constructors -- TODO be better
  constructor(scope: GuStack) {
    super(scope, "GuLogShippingPolicy", {
      actions: ["kinesis:Describe*", "kinesis:Put*"],
      resources: [
        `arn:aws:kinesis:${scope.region}:${scope.account}:stream/${
          GuLoggingStreamNameParameter.getInstance(scope).valueAsString
        }`,
      ],
    });
  }
}
