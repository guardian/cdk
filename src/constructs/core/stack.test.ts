import "@aws-cdk/assert/jest";

import { SynthUtils } from "@aws-cdk/assert";
import { Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import { App } from "@aws-cdk/core";
import { GuStack } from "./stack";

describe("GuStack", () => {
  it("should apply the stack and stage tags to resources added to it", () => {
    const stack = new GuStack(new App());

    new Role(stack, "MyRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});
