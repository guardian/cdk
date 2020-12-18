import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import type { SynthedStack } from "../../../../test/utils";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../../test/utils";
import { GuPolicy } from "./base-policy";

describe("The GuPolicy", () => {
  it("overrides id if prop set to true", () => {
    const stack = simpleGuStackForTesting();
    const policy = new GuPolicy(stack, "Policy", {
      overrideId: true,
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:GetObject"],
          resources: [`arn:aws:s3:::test/*`],
        }),
      ],
    });

    attachPolicyToTestRole(stack, policy);

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(Object.keys(json.Resources)).toContain("Policy");
  });

  it("does not override id if prop set to false", () => {
    const stack = simpleGuStackForTesting();
    const policy = new GuPolicy(stack, "Policy", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:GetObject"],
          resources: [`arn:aws:s3:::test/*`],
        }),
      ],
    });

    attachPolicyToTestRole(stack, policy);

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(Object.keys(json.Resources)).not.toContain("Policy");
  });
});
