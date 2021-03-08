import { Stage, Stages } from "../../../constants";
import type { GuStack } from "../stack";
import { GuParameter } from "./base";

export class GuStageParameter extends GuParameter {
  public static readonly defaultId = "Stage";
  constructor(scope: GuStack, id: string = GuStageParameter.defaultId) {
    super(scope, id, {
      type: "String",
      description: "Stage name",
      allowedValues: Stages,
      default: Stage.CODE,
    });
  }
}

export class GuStackParameter extends GuParameter {
  public static readonly defaultId = "Stack";
  constructor(scope: GuStack, id: string = GuStackParameter.defaultId) {
    super(scope, id, {
      type: "String",
      description: "Name of this stack",
      default: "deploy",
    });
  }
}
