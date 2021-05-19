import { Stage, Stages } from "../../../constants";
import { GuStringParameter } from "./base";
import type { GuStack } from "../stack";

export class GuStageParameter extends GuStringParameter {
  constructor(scope: GuStack) {
    super(scope, "Stage", {
      description: "Stage name",
      allowedValues: Stages,
      default: Stage.CODE,
    });
  }
}

export class GuStackParameter extends GuStringParameter {
  constructor(scope: GuStack) {
    super(scope, "Stack", {
      description: "Name of this stack",
      default: "deploy",
    });
  }
}
