import { CfnMapping } from "@aws-cdk/core";
import type { GuStack } from "./stack";

export interface GuStageVariable {
  variableName: string;
  codeValue: unknown;
  prodValue: unknown;
}

export class GuStageMapping extends CfnMapping {
  addStageVariable(stageVariable: GuStageVariable): void {
    this.setValue("CODE", stageVariable.variableName, stageVariable.codeValue);
    this.setValue("PROD", stageVariable.variableName, stageVariable.prodValue);
  }
  constructor(scope: GuStack, id: string = "stage-mapping") {
    super(scope, id);
  }
}
