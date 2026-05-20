import { CfnParameter } from "aws-cdk-lib";
import type { GuStack } from "../../constructs/core";
import { isSingletonPresentInStack } from "../../utils/singleton";

export class GuRiffRaffDeploymentIdParameterExperimental extends CfnParameter {
  private static instance: GuRiffRaffDeploymentIdParameterExperimental | undefined;

  private constructor(scope: GuStack) {
    super(scope, "RiffRaffDeploymentId", {
      type: "String",
      description: "Used by Riff-Raff to inject the deployment ID.",
    });
  }

  public static getInstance(stack: GuStack): GuRiffRaffDeploymentIdParameterExperimental {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuRiffRaffDeploymentIdParameterExperimental(stack);
    }

    return this.instance;
  }
}
