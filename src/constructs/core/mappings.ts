import { CfnMapping } from "@aws-cdk/core";
import type { GuStack } from "./stack";

export interface GuStageDependentValue {
  variableName: string;
  codeValue: number | string | boolean;
  prodValue: unknown;
}

export interface GuStageDependentNumber extends GuStageDependentValue {
  codeValue: number;
  prodValue: number;
}

export interface GuStageDependentString extends GuStageDependentValue {
  codeValue: string;
  prodValue: string;
}

export interface GuStageDependentBoolean extends GuStageDependentValue {
  codeValue: boolean;
  prodValue: boolean;
}

export class GuStageMapping extends CfnMapping {
  constructor(scope: GuStack, id: string = "stage-mapping") {
    super(scope, id);
  }
}
