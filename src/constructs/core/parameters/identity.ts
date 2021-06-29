import { Stage, Stages } from "../../../constants";
import { isSingletonPresentInStack } from "../../../utils/test";
import type { GuStack } from "../stack";
import { GuStringParameter } from "./base";

export class GuStageParameter extends GuStringParameter {
  private static instance: GuStageParameter | undefined;

  private constructor(scope: GuStack) {
    super(scope, "Stage", {
      description: "Stage name",
      allowedValues: Stages,
      default: Stage.CODE,
    });
  }

  public static getInstance(stack: GuStack): GuStageParameter {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuStageParameter(stack);
    }

    return this.instance;
  }
}
