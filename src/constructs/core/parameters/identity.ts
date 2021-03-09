import { Stage, Stages } from "../../../constants";
import type { GuStack } from "../stack";
import { GuStringParameter } from "./base";

export class GuStageParameter extends GuStringParameter {
  public static readonly defaultId = "Stage";
  constructor(scope: GuStack, id: string = GuStageParameter.defaultId) {
    super(scope, id, {
      description: "Stage name",
      allowedValues: Stages,
      default: Stage.CODE,
    });
  }
}

export class GuStackParameter extends GuStringParameter {
  public static readonly defaultId = "Stack";
  constructor(scope: GuStack, id: string = GuStackParameter.defaultId) {
    super(scope, id, {
      description: "Name of this stack",
      default: "deploy",
    });
  }
}
