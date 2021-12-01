import { CfnMapping } from "@aws-cdk/core";
import type { StageAwareValue } from "../../types/stage";
import type { AppIdentity } from "./identity";
import type { GuStack } from "./stack";

export type GuMappingValue = string | number | boolean;

export interface GuStageMappingValue<T extends GuMappingValue> extends AppIdentity {
  variableName: string;
  stageValues: StageAwareValue<T>;
}

export class GuStageMapping {
  private readonly scope: GuStack;

  // the key in this Map is an app string
  private mappings: Map<string, CfnMapping>;

  constructor(scope: GuStack) {
    this.scope = scope;
    this.mappings = new Map<string, CfnMapping>();
  }

  private getCfnMapping(app: string): CfnMapping {
    if (!this.mappings.has(app)) {
      const emptyCfnMapping = new CfnMapping(this.scope, app);
      this.mappings.set(app, emptyCfnMapping);
      return emptyCfnMapping;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- `this.mappings.has` above is `true`, so we can safely assert non-null
    return this.mappings.get(app)!;
  }

  withValue<T extends GuMappingValue>(mappingValue: GuStageMappingValue<T>): T {
    const { app, variableName, stageValues } = mappingValue;

    const cfnMapping = this.getCfnMapping(app);

    for (const [stage, value] of Object.entries(stageValues)) {
      cfnMapping.setValue(stage, variableName, value);
    }

    return cfnMapping.findInMap(this.scope.stage, variableName) as T;
  }
}
