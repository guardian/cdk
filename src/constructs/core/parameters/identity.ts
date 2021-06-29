import { Stage, Stages } from "../../../constants";
import type { GuStack } from "../stack";
import { GuStringParameter } from "./base";

export class GuStageParameter extends GuStringParameter {
  constructor(scope: GuStack) {
    super(scope, "Stage", {
      description: "Stage name",
      allowedValues: Stages,
      default: Stage.CODE,
    });
  }
}
