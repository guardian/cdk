import { CfnMapping } from "@aws-cdk/core";
import type { Stage } from "../../constants";
import type { GuStack } from "./stack";

export interface GuStageDependentValue<T extends string | number | boolean> {
  variableName: string;
  stageValues: Record<Stage, T>;
}

export class GuStageMapping extends CfnMapping {
  constructor(scope: GuStack, id: string = "stage-mapping") {
    super(scope, id);
  }
}
