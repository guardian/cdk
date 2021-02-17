import { CfnMapping } from "@aws-cdk/core";
import type { GuStack } from "./stack";

export interface GuStageDependentValue {
  variableName: string;
  codeValue: unknown;
  prodValue: unknown;
}

export class GuStageMapping extends CfnMapping {
  constructor(scope: GuStack, id: string = "stage-mapping") {
    super(scope, id);
  }
}
