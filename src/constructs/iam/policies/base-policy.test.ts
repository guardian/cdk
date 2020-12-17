import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Effect, PolicyStatement, Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import { App } from "@aws-cdk/core";
import type { SynthedStack } from "../../../../test/utils/synthed-stack";
import { GuStack } from "../../core";
import { GuPolicy } from "./base-policy";

describe("The GuPolicy", () => {
  it("overrides id if prop set to true", () => {
    const stack = new GuStack(new App());
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

    policy.attachToRole(
      new Role(stack, "TestRole", {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      })
    );

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(Object.keys(json.Resources)).toContain("Policy");
  });

  it("does not override id if prop set to false", () => {
    const stack = new GuStack(new App());
    const policy = new GuPolicy(stack, "Policy", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:GetObject"],
          resources: [`arn:aws:s3:::test/*`],
        }),
      ],
    });

    policy.attachToRole(
      new Role(stack, "TestRole", {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      })
    );

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(Object.keys(json.Resources)).not.toContain("Policy");
  });
});
